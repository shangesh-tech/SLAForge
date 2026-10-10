import {
  formatUnits,
  toFunctionSelector,
  type AbiFunction,
  type Address,
  type Hash,
} from "viem";
import { slaForgeAbi } from "./abi";
import { EXPLORER_API, SLAFORGE_ADDRESS, USDC_ADDRESS } from "./config";
import { sameAddress } from "@/lib/utils";

export type TransferKind =
  | "payment"
  | "fee"
  | "bond"
  | "bondRefund"
  | "withdrawal"
  | "received"
  | "sent";

export type WalletTransfer = {
  id: string;
  hash: Hash;
  at: string;
  amount: number;
  direction: "in" | "out";
  kind: TransferKind;
  counterparty: Address;
};

/** Blockscout's cursor for the next page, passed back as query parameters. */
export type HistoryCursor = Record<string, string | number> | null;

type ExplorerTransfer = {
  transaction_hash: Hash;
  log_index: number;
  timestamp: string;
  method: string | null;
  from: { hash: Address };
  to: { hash: Address };
  total: { value: string; decimals: string };
};

const methodNames = Object.fromEntries(
  (slaForgeAbi as readonly { type: string }[])
    .filter((item): item is AbiFunction => item.type === "function")
    .map((fn) => [toFunctionSelector(fn), fn.name]),
);

function classify(method: string, outgoing: boolean, counterparty: Address): TransferKind {
  const name = methodNames[method] ?? method;
  if (name === "createAgreement")
    return sameAddress(counterparty, SLAFORGE_ADDRESS) ? "payment" : "fee";
  if (name === "listService" || name === "rebondService") return "bond";
  if (name === "delistService") return "bondRefund";
  if (name === "withdraw") return "withdrawal";
  return outgoing ? "sent" : "received";
}

/** USDC moving in and out of a wallet, newest first, from the Arc explorer. */
export async function readWalletTransfers(account: Address, cursor?: HistoryCursor) {
  const params = new URLSearchParams({ type: "ERC-20", token: USDC_ADDRESS });
  for (const [key, value] of Object.entries(cursor ?? {}))
    params.set(key, String(value));
  const res = await fetch(
    `${EXPLORER_API}/addresses/${account}/token-transfers?${params}`,
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`The explorer answered ${res.status}.`);
  const data = (await res.json()) as {
    items: ExplorerTransfer[];
    next_page_params: HistoryCursor;
  };
  const items = data.items.map((t): WalletTransfer => {
    const outgoing = sameAddress(t.from.hash, account);
    const counterparty = outgoing ? t.to.hash : t.from.hash;
    return {
      id: `${t.transaction_hash}-${t.log_index}`,
      hash: t.transaction_hash,
      at: t.timestamp,
      amount: Number(formatUnits(BigInt(t.total.value), Number(t.total.decimals))),
      direction: outgoing ? "out" : "in",
      kind: classify(t.method ?? "", outgoing, counterparty),
      counterparty,
    };
  });
  return { items, next: data.next_page_params };
}
