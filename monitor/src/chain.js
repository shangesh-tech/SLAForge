import { createPublicClient, createWalletClient, http } from "viem";
import { slaForgeAbi } from "./abi.js";
import { account, chain, RPC_URL, SLAFORGE_ADDRESS } from "./config.js";

const contract = { address: SLAFORGE_ADDRESS, abi: slaForgeAbi };

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL, { retryCount: 2, timeout: 20_000 }),
});

export const walletClient = account
  ? createWalletClient({ account, chain, transport: http(RPC_URL, { timeout: 20_000 }) })
  : null;

// Enum indexes from SLAForge.sol
export const ServiceStatus = { Bonded: 1 };
export const AgreementStatus = { Active: 1 };

/** Every service and agreement on the contract, plus the contract's monitor address. */
export async function readMarket() {
  const [totalServices, totalAgreements, monitor] = await Promise.all([
    publicClient.readContract({ ...contract, functionName: "totalServiceIds" }),
    publicClient.readContract({ ...contract, functionName: "totalAgreementIds" }),
    publicClient.readContract({ ...contract, functionName: "monitor" }),
  ]);
  const serviceViews =
    totalServices > 0n
      ? await publicClient.readContract({
          ...contract,
          functionName: "getServices",
          args: [0n, totalServices],
        })
      : [];
  const agreementViews =
    totalAgreements > 0n
      ? await publicClient.multicall({
          allowFailure: false,
          contracts: Array.from({ length: Number(totalAgreements) }, (_, i) => ({
            ...contract,
            functionName: "getAgreementById",
            args: [BigInt(i + 1)],
          })),
        })
      : [];

  const services = new Map(
    serviceViews.map((s) => [
      s.id.toString(),
      {
        id: s.id.toString(),
        status: Number(s.status),
        uptimeBps: Number(s.uptimeBps),
        maxLatencyMs: Number(s.maxLatencyMs),
        endpoint: s.endpoint,
      },
    ]),
  );
  const agreements = agreementViews.map((a) => ({
    id: a.id.toString(),
    serviceId: a.serviceId.toString(),
    status: Number(a.status),
    start: Number(a.startTime) * 1000,
    end: Number(a.endTime) * 1000,
  }));
  return { services, agreements, monitor };
}

/** Reports one agreement's result on-chain and waits for it to be mined. */
export async function settleAgreement(agreementId, slaMet) {
  const { request } = await publicClient.simulateContract({
    ...contract,
    functionName: "settleAgreement",
    args: [BigInt(agreementId), slaMet],
    account,
  });
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Settlement tx ${hash} reverted.`);
  return hash;
}
