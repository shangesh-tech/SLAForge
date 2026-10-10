import { createWalletClient, http, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { slaForgeAbi } from "@/lib/web3/abi";
import {
  arcChain,
  publicClient,
  RPC_URL,
  SLAFORGE_ADDRESS,
} from "@/lib/web3/config";
import { readMarket } from "@/lib/web3/slaforge";
import type { Agreement, Service } from "@/lib/types";
import { db, monitorCollection } from "./db";

/**
 * How often the monitor runs (one health check per service per run).
 * Set MONITOR_INTERVAL_SECONDS to change it; the default is 120 (2 minutes).
 */
export const CHECK_INTERVAL_MS =
  Math.max(5, Number(process.env.MONITOR_INTERVAL_SECONDS) || 120) * 1000;
/** A run must not overlap the next one; the lock covers most of the interval. */
const LOCK_MS = Math.max(4_000, CHECK_INTERVAL_MS - 10_000);
const REQUEST_TIMEOUT_MS = 10_000;

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
  lastResult?: TickResult;
};

export type TickResult = {
  ok: boolean;
  checked: number;
  settled: number;
  skipped?: string;
  errors: string[];
  at: string;
};

export async function collections() {
  const d = await db();
  return {
    checks: d.collection<CheckDoc>(monitorCollection("checks")),
    settlements: d.collection<SettlementDoc>(monitorCollection("settlements")),
    state: d.collection<StateDoc>(monitorCollection("monitor_state")),
  };
}

function monitorAccount() {
  // Accept keys with or without the 0x prefix (MetaMask exports them without it).
  const raw = process.env.MONITOR_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return privateKeyToAccount(key as `0x${string}`);
}

/** Pings a health endpoint once. Any 2xx/3xx answer within 10s counts as up. */
export async function probe(endpoint: string) {
  const started = performance.now();
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { "user-agent": "SLAForge-Monitor/1.0" },
    });
    const latencyMs = Math.round(performance.now() - started);
    await res.body?.cancel().catch(() => {});
    return {
      ok: res.status < 400,
      status: res.status,
      latencyMs,
      error: res.status < 400 ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    const timeout = (e as Error)?.name === "TimeoutError";
    return {
      ok: false,
      status: null,
      latencyMs: null,
      error: timeout ? "Timed out after 10s" : "Unreachable",
    };
  }
}

/** p95 of successful response times (nearest-rank). */
function p95(latencies: number[]) {
  if (!latencies.length) return null;
  const sorted = [...latencies].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

/** Uptime, p95 latency and the SLA verdict for one agreement. */
export function measure(service: Service, agreement: Agreement, checks: CheckDoc[]) {
  const total = checks.length;
  const failed = checks.filter((c) => !c.ok).length;
  const uptimeBps = total ? Math.floor(((total - failed) / total) * 10_000) : 0;
  const latency = p95(
    checks.filter((c) => c.ok && c.latencyMs !== null).map((c) => c.latencyMs!),
  );
  const targetBps = Math.round(service.uptime * 100);
  const start = new Date(agreement.start!).getTime();
  const end = new Date(agreement.end!).getTime();
  // Failures the SLA allows over the whole period. Going past it means the
  // target can no longer be reached, so the agreement fails early.
  const expected = Math.max(1, Math.floor((end - start) / CHECK_INTERVAL_MS));
  const allowedFailures = Math.floor((expected * (10_000 - targetBps)) / 10_000);
  return {
    total,
    failed,
    uptimeBps,
    p95LatencyMs: latency,
    uptimeOk: total > 0 && uptimeBps >= targetBps,
    latencyOk: latency !== null && latency <= service.latency,
    budgetExceeded: failed > allowedFailures,
  };
}

/** One monitor run: check every service with active agreements, then settle. */
export async function runMonitorTick(): Promise<TickResult> {
  const now = new Date();
  const result: TickResult = {
    ok: true,
    checked: 0,
    settled: 0,
    errors: [],
    at: now.toISOString(),
  };
  const { checks, settlements, state } = await collections();

  // Lock: only one run per interval, even with several server instances.
  const lock = await state.findOneAndUpdate(
    {
      _id: "monitor",
      lockedUntil: { $lt: now },
    },
    { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS) } },
    { returnDocument: "after" },
  ).catch(() => null);
  if (!lock) {
    const inserted = await state
      .insertOne({ _id: "monitor", lockedUntil: new Date(now.getTime() + LOCK_MS) })
      .then(() => true)
      .catch(() => false);
    if (!inserted) return { ...result, skipped: "Another run is in progress." };
  }

  try {
    const market = await readMarket();
    const active = market.agreements.filter((a) => a.status === "Active");
    const services = new Map(market.services.map((s) => [s.id, s]));

    // 1. Health checks: one per service that has active agreements.
    const watched = [...new Set(active.map((a) => a.serviceId))]
      .map((id) => services.get(id))
      .filter((s): s is Service => !!s);
    const probes = await Promise.all(
      watched.map(async (s) => ({ s, r: await probe(s.endpoint) })),
    );
    if (probes.length)
      await checks.insertMany(
        probes.map(({ s, r }) => ({
          serviceId: s.id,
          endpoint: s.endpoint,
          at: now,
          ...r,
        })),
      );
    result.checked = probes.length;

    // 2. Settlement: needs the monitor key, and it must be the contract's monitor.
    const account = monitorAccount();
    if (!account) {
      result.skipped = "MONITOR_PRIVATE_KEY is not set, so agreements are not settled.";
      return result;
    }
    if (account.address.toLowerCase() !== market.monitor?.toLowerCase()) {
      result.skipped = `Monitor key ${account.address} is not the contract monitor ${market.monitor}. Call setMonitor first.`;
      return result;
    }
    const wallet = createWalletClient({
      account,
      chain: arcChain,
      transport: http(RPC_URL),
    });

    // The contract compares against block time, so "ended" uses chain time too.
    const block = await publicClient.getBlock();
    const chainNow = new Date(Number(block.timestamp) * 1000);

    for (const a of active) {
      const service = services.get(a.serviceId);
      if (!service) continue;
      const end = new Date(a.end!);
      const window = await checks
        .find({ serviceId: a.serviceId, at: { $gte: new Date(a.start!), $lte: end } })
        .toArray();
      // A short plan can end between two ticks: use the first check after the end.
      if (!window.length && chainNow >= end) {
        const after = await checks
          .find({ serviceId: a.serviceId, at: { $gte: end } })
          .sort({ at: 1 })
          .limit(1)
          .toArray();
        window.push(...after);
      }
      const m = measure(service, a, window);
      const ended = chainNow >= end;
      let slaMet: boolean | null = null;
      let reason = "";
      if (m.budgetExceeded) {
        slaMet = false;
        reason = `${m.failed} failed checks exceeded the allowed downtime.`;
      } else if (ended) {
        slaMet = m.uptimeOk && m.latencyOk;
        reason = slaMet
          ? "Uptime and p95 latency met their targets."
          : !m.uptimeOk
            ? `Uptime ${(m.uptimeBps / 100).toFixed(2)}% was below ${service.uptime}%.`
            : `p95 latency ${m.p95LatencyMs ?? "—"}ms was above ${service.latency}ms.`;
      }
      if (slaMet === null) continue;

      try {
        const { request } = await publicClient.simulateContract({
          address: SLAFORGE_ADDRESS,
          abi: slaForgeAbi,
          functionName: "settleAgreement",
          args: [BigInt(a.id), slaMet],
          account,
        });
        const txHash = await wallet.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        await settlements.updateOne(
          { _id: a.id },
          {
            $set: {
              serviceId: a.serviceId,
              slaMet,
              reason,
              uptimeBps: m.uptimeBps,
              p95LatencyMs: m.p95LatencyMs,
              checks: m.total,
              failedChecks: m.failed,
              txHash,
              at: new Date(),
            },
          },
          { upsert: true },
        );
        result.settled++;
      } catch (e) {
        result.ok = false;
        result.errors.push(`Agreement #${a.id}: ${(e as Error).message.split("\n")[0]}`);
      }
    }
    return result;
  } catch (e) {
    result.ok = false;
    result.errors.push((e as Error).message.split("\n")[0]);
    return result;
  } finally {
    await state
      .updateOne({ _id: "monitor" }, { $set: { lastRunAt: now, lastResult: result } })
      .catch(() => {});
  }
}

/** Public monitor status for the UI. */
export async function monitorStatus() {
  const { state } = await collections();
  const doc = await state.findOne({ _id: "monitor" });
  const account = monitorAccount();
  return {
    intervalMs: CHECK_INTERVAL_MS,
    monitorAddress: account?.address ?? null,
    lastRunAt: doc?.lastRunAt?.toISOString() ?? null,
    lastResult: doc?.lastResult ?? null,
  };
}
