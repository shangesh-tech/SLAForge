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
/** Bond limits enforced by the contract (USDC). */
export const minBond = 1;
export const maxBond = 100;
export const defaultBond = 50;
/** SLA met: the provider is credited. SLA missed: the customer is credited a
 * full refund, the provider gets nothing, and the service's full bond is
 * slashed to the treasury. The platform fee is kept either way. Credits are
 * withdrawn from the contract with `withdraw()`. */
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

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
export const durationLabel = (minutes: number) =>
  minutes % 1440 === 0
    ? plural(minutes / 1440, "day")
    : minutes % 60 === 0
      ? plural(minutes / 60, "hour")
      : `${Math.round(minutes * 100) / 100} min`;
export const sameAddress = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();
