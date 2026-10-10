import {
  formatUnits,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { slaForgeAbi } from "./abi";
import {
  arcChain,
  erc20Abi,
  publicClient,
  SLAFORGE_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "./config";
import { categories, type Agreement, type Service } from "@/lib/types";
import { durationLabel, shortAddress } from "@/lib/utils";

const contract = { address: SLAFORGE_ADDRESS, abi: slaForgeAbi } as const;
const serviceStatuses = ["None", "Bonded", "Slashed", "Delisted"] as const;
const agreementStatuses = ["None", "Active", "Passed", "Failed"] as const;
const colors = ["blue", "purple", "peach", "green", "pink", "sand"];

export const toUsdc = (amount: bigint) =>
  Number(formatUnits(amount, USDC_DECIMALS));
export const fromUsdc = (amount: number | string) =>
  parseUnits(String(amount), USDC_DECIMALS);
const toIso = (seconds: bigint) => new Date(Number(seconds) * 1000).toISOString();

type ServiceView = {
  id: bigint;
  provider: Address;
  status: number;
  category: number;
  uptimeBps: bigint;
  maxLatencyMs: bigint;
  activeAgreements: bigint;
  bond: bigint;
  name: string;
  description: string;
  endpoint: string;
  docsUrl: string;
  plans: readonly { price: bigint; duration: bigint }[];
};

type AgreementView = {
  id: bigint;
  serviceId: bigint;
  customer: Address;
  provider: Address;
  planIndex: bigint;
  status: number;
  price: bigint;
  startTime: bigint;
  endTime: bigint;
};

function toService(v: ServiceView): Service {
  const firstSentence = v.description.split(/(?<=[.!?])\s/)[0];
  return {
    id: v.id.toString(),
    name: v.name,
    provider: shortAddress(v.provider),
    providerAddress: v.provider,
    category: categories[v.category],
    description: v.description,
    tagline:
      firstSentence.length > 110
        ? `${firstSentence.slice(0, 107)}…`
        : firstSentence,
    uptime: Number(v.uptimeBps) / 100,
    latency: Number(v.maxLatencyMs),
    endpoint: v.endpoint,
    docs: v.docsUrl,
    color: colors[v.category] ?? "blue",
    letter: v.name.trim().charAt(0).toUpperCase(),
    plans: v.plans.map((p, i) => {
      const minutes = Number(p.duration) / 60;
      return {
        id: String(i),
        name: `${durationLabel(minutes)} plan`,
        minutes,
        price: toUsdc(p.price),
      };
    }),
    online: serviceStatuses[v.status] === "Bonded",
    customers: Number(v.activeAgreements),
    bond: toUsdc(v.bond),
    bondStatus: serviceStatuses[v.status] as Service["bondStatus"],
  };
}

function toAgreement(v: AgreementView): Agreement {
  return {
    id: v.id.toString(),
    serviceId: v.serviceId.toString(),
    planId: v.planIndex.toString(),
    price: toUsdc(v.price),
    status: agreementStatuses[v.status] as Agreement["status"],
    customer: v.customer,
    provider: v.provider,
    created: toIso(v.startTime),
    start: toIso(v.startTime),
    end: toIso(v.endTime),
  };
}

/** Every service and agreement on the contract, plus the monitor address. */
export async function readMarket() {
  const [totalServices, totalAgreements, monitor] = await Promise.all([
    publicClient.readContract({ ...contract, functionName: "totalServiceIds" }),
    publicClient.readContract({
      ...contract,
      functionName: "totalAgreementIds",
    }),
    publicClient.readContract({ ...contract, functionName: "monitor" }),
  ]);
  const serviceViews =
    totalServices > BigInt(0)
      ? await publicClient.readContract({
          ...contract,
          functionName: "getServices",
          args: [BigInt(0), totalServices],
        })
      : [];
  const agreementViews = totalAgreements
    ? await publicClient.multicall({
        allowFailure: false,
        contracts: Array.from({ length: Number(totalAgreements) }, (_, i) => ({
          ...contract,
          functionName: "getAgreementById" as const,
          args: [BigInt(i + 1)] as const,
        })),
      })
    : [];
  return {
    services: serviceViews.map(toService).reverse(),
    agreements: agreementViews.map(toAgreement).reverse(),
    monitor,
  };
}

/** One agreement and its service, or null if the agreement does not exist. */
export async function readAgreement(id: string) {
  try {
    const a = await publicClient.readContract({
      ...contract,
      functionName: "getAgreementById",
      args: [BigInt(id)],
    });
    const s = await publicClient.readContract({
      ...contract,
      functionName: "getServiceById",
      args: [a.serviceId],
    });
    return { agreement: toAgreement(a), service: toService(s) };
  } catch {
    return null;
  }
}

/** USDC in the wallet and USDC waiting in the contract for this address. */
export async function readBalances(account: Address) {
  const [wallet, claimable] = await publicClient.multicall({
    allowFailure: false,
    contracts: [
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
      },
      { ...contract, functionName: "withdrawableBalance", args: [account] },
    ],
  });
  return { wallet: toUsdc(wallet), claimable: toUsdc(claimable) };
}

export type Step = (message: string, hash?: Hash) => void;
type Signer = { walletClient: WalletClient; account: Address; step: Step };

async function confirm({ step }: Signer, hash: Hash, message: string) {
  step(message, hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error("The transaction was reverted.");
  return receipt;
}

/** Approves the contract to pull `amount` USDC, if the allowance is short. */
async function approve(signer: Signer, amount: bigint) {
  const { walletClient, account, step } = signer;
  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, SLAFORGE_ADDRESS],
  });
  if (allowance >= amount) return;
  step(`Approve ${formatUnits(amount, USDC_DECIMALS)} USDC in your wallet…`);
  const hash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "approve",
    args: [SLAFORGE_ADDRESS, amount],
    account,
    chain: arcChain,
  });
  await confirm(signer, hash, "Confirming USDC approval…");
}

export type ServiceDraft = {
  name: string;
  description: string;
  category: number;
  endpoint: string;
  docs: string;
  uptime: number;
  latency: number;
  bond: number;
  plans: { price: number; minutes: number }[];
};

export async function listService(signer: Signer, d: ServiceDraft) {
  const bond = fromUsdc(d.bond);
  await approve(signer, bond);
  const { request } = await publicClient.simulateContract({
    ...contract,
    account: signer.account,
    functionName: "listService",
    args: [
      d.name,
      d.description,
      d.category,
      d.endpoint,
      d.docs,
      BigInt(Math.round(d.uptime * 100)),
      BigInt(d.latency),
      bond,
      d.plans.map((p) => ({
        price: fromUsdc(p.price),
        duration: BigInt(Math.round(p.minutes * 60)),
      })),
    ],
  });
  signer.step("Confirm the listing in your wallet…");
  const hash = await signer.walletClient.writeContract(request);
  const receipt = await confirm(signer, hash, "Publishing your service…");
  const [event] = parseEventLogs({
    abi: slaForgeAbi,
    eventName: "ServiceListed",
    logs: receipt.logs,
  });
  return { id: event.args.serviceId.toString(), hash };
}

export async function createAgreement(
  signer: Signer,
  serviceId: string,
  planIndex: number,
) {
  const [, , total] = await publicClient.readContract({
    ...contract,
    functionName: "quoteAgreement",
    args: [BigInt(serviceId), BigInt(planIndex)],
  });
  await approve(signer, total);
  const { request } = await publicClient.simulateContract({
    ...contract,
    account: signer.account,
    functionName: "createAgreement",
    args: [BigInt(serviceId), BigInt(planIndex)],
  });
  signer.step("Confirm the agreement in your wallet…");
  const hash = await signer.walletClient.writeContract(request);
  const receipt = await confirm(signer, hash, "Funding your agreement…");
  const [event] = parseEventLogs({
    abi: slaForgeAbi,
    eventName: "AgreementCreated",
    logs: receipt.logs,
  });
  return { id: event.args.agreementId.toString(), hash };
}

export async function rebondService(
  signer: Signer,
  serviceId: string,
  amount: number,
) {
  const bond = fromUsdc(amount);
  await approve(signer, bond);
  const { request } = await publicClient.simulateContract({
    ...contract,
    account: signer.account,
    functionName: "rebondService",
    args: [BigInt(serviceId), bond],
  });
  signer.step("Confirm the bond in your wallet…");
  const hash = await signer.walletClient.writeContract(request);
  await confirm(signer, hash, "Posting your bond…");
  return { hash };
}

/** Adds USDC to the bond of a live service (total stays at or under 100 USDC). */
export async function increaseBond(
  signer: Signer,
  serviceId: string,
  amount: number,
) {
  const value = fromUsdc(amount);
  await approve(signer, value);
  const { request } = await publicClient.simulateContract({
    ...contract,
    account: signer.account,
    functionName: "increaseBond",
    args: [BigInt(serviceId), value],
  });
  signer.step("Confirm the top-up in your wallet…");
  const hash = await signer.walletClient.writeContract(request);
  await confirm(signer, hash, "Adding to your bond…");
  return { hash };
}

export async function delistService(signer: Signer, serviceId: string) {
  const { request } = await publicClient.simulateContract({
    ...contract,
    account: signer.account,
    functionName: "delistService",
    args: [BigInt(serviceId)],
  });
  signer.step("Confirm delisting in your wallet…");
  const hash = await signer.walletClient.writeContract(request);
  await confirm(signer, hash, "Delisting and refunding your bond…");
  return { hash };
}

export async function withdraw(signer: Signer) {
  const { request } = await publicClient.simulateContract({
    ...contract,
    account: signer.account,
    functionName: "withdraw",
  });
  signer.step("Confirm the withdrawal in your wallet…");
  const hash = await signer.walletClient.writeContract(request);
  await confirm(signer, hash, "Withdrawing your USDC…");
  return { hash };
}
