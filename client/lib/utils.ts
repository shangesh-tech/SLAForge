import { Agreement } from "./types";
export const usdc = (n: number) =>
  `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC`;
export const shortAddress = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
export const percent = (n: number) => `${n.toFixed(2)}%`;
export const date = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const platformFee = 0.1;
export const minBond = 10;
export const defaultBond = 40;
/** SLA met: the provider is paid. SLA missed: the customer gets a full refund,
 * the provider gets nothing, and the service's full bond is slashed to the
 * treasury. The platform fee is kept either way. */
export function settlement(
  a: Pick<Agreement, "price" | "status">,
  serviceBond: number,
) {
  const failed = a.status === "Failed";
  return {
    provider: failed ? 0 : a.price,
    refund: failed ? a.price : 0,
    slashedBond: failed ? serviceBond : 0,
    treasury: platformFee + (failed ? serviceBond : 0),
    fee: platformFee,
  };
}
export const meetsSLA = (
  uptime: number,
  latency: number,
  targetUptime: number,
  maxLatency: number,
) => uptime >= targetUptime && latency <= maxLatency;

export const durationLabel = (minutes: number) =>
  minutes % 1440 === 0
    ? `${minutes / 1440} days`
    : minutes % 60 === 0
      ? `${minutes / 60} hours`
      : `${minutes} min`;
