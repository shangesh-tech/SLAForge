import type { Hash } from "viem";
import type { Service } from "@/lib/types";
import { db, monitorCollection } from "./db";

/**
 * Read-only access to the data written by the SLAForge monitor service
 * (../monitor): health checks, settlements and the monitor's last run.
 */

/** Used until the monitor has reported its own interval. */
const DEFAULT_INTERVAL_MS = 120_000;

export type CheckDoc = {
  serviceId: string;
  endpoint: string;
  at: Date;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error: string | null;
};

export type SettlementDoc = {
  _id: string; // agreement id
  serviceId: string;
  slaMet: boolean;
  reason: string;
  uptimeBps: number;
  p95LatencyMs: number | null;
  checks: number;
  failedChecks: number;
  txHash: Hash;
  at: Date;
};

type StateDoc = {
  _id: "monitor";
  lockedUntil: Date;
  lastRunAt?: Date;
  lastResult?: { ok: boolean; checked: number; settled: number; skipped?: string; errors: string[] };
  intervalMs?: number;
  monitorAddress?: string | null;
};

export async function collections() {
  const d = await db();
  return {
    checks: d.collection<CheckDoc>(monitorCollection("checks")),
    settlements: d.collection<SettlementDoc>(monitorCollection("settlements")),
    state: d.collection<StateDoc>(monitorCollection("monitor_state")),
  };
}

/** p95 of successful response times (nearest-rank). */
function p95(latencies: number[]) {
  if (!latencies.length) return null;
  const sorted = [...latencies].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

/** Uptime and p95 latency so far for one agreement (same formulas as the monitor). */
export function measure(service: Service, checks: CheckDoc[]) {
  const total = checks.length;
  const failed = checks.filter((c) => !c.ok).length;
  const latency = p95(
    checks.filter((c) => c.ok && c.latencyMs !== null).map((c) => c.latencyMs!),
  );
  return {
    total,
    failed,
    uptimeBps: total ? Math.floor(((total - failed) / total) * 10_000) : 0,
    p95LatencyMs: latency,
    latencyOk: latency !== null && latency <= service.latency,
  };
}

/** The monitor's interval and last run, for the UI. */
export async function monitorStatus() {
  const { state } = await collections();
  const doc = await state.findOne({ _id: "monitor" });
  return {
    intervalMs: doc?.intervalMs ?? DEFAULT_INTERVAL_MS,
    monitorAddress: doc?.monitorAddress ?? null,
    lastRunAt: doc?.lastRunAt?.toISOString() ?? null,
    lastResult: doc?.lastResult ?? null,
  };
}
