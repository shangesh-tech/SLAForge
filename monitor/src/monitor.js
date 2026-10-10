import { account, INTERVAL_MS, LOCK_MS, NETWORK, SLAFORGE_ADDRESS } from "./config.js";
import { AgreementStatus, publicClient, readMarket, settleAgreement } from "./chain.js";
import { connect } from "./db.js";

const REQUEST_TIMEOUT_MS = 10_000;

/** Pings a health endpoint once. Any 2xx/3xx answer within 10s counts as up. */
export async function probe(endpoint) {
  const started = performance.now();
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      redirect: "follow",
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
    return {
      ok: false,
      status: null,
      latencyMs: null,
      error: e?.name === "TimeoutError" ? "Timed out after 10s" : "Unreachable",
    };
  }
}

/** p95 of successful response times (nearest-rank). */
function p95(latencies) {
  if (!latencies.length) return null;
  const sorted = [...latencies].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

/** Uptime, p95 latency and the SLA verdict for one agreement's checks. */
export function measure(service, agreement, checks) {
  const total = checks.length;
  const failed = checks.filter((c) => !c.ok).length;
  const uptimeBps = total ? Math.floor(((total - failed) / total) * 10_000) : 0;
  const latency = p95(checks.filter((c) => c.ok && c.latencyMs !== null).map((c) => c.latencyMs));
  // Failures the SLA allows over the whole period. Going past it means the
  // target can no longer be reached, so the agreement fails early.
  const expected = Math.max(1, Math.floor((agreement.end - agreement.start) / INTERVAL_MS));
  const allowedFailures = Math.floor((expected * (10_000 - service.uptimeBps)) / 10_000);
  return {
    total,
    failed,
    uptimeBps,
    p95LatencyMs: latency,
    uptimeOk: total > 0 && uptimeBps >= service.uptimeBps,
    latencyOk: latency !== null && latency <= service.maxLatencyMs,
    budgetExceeded: failed > allowedFailures,
  };
}

/** Takes the run lock in MongoDB so only one run happens per interval, on any number of hosts. */
async function takeLock(state, now) {
  const until = new Date(now.getTime() + LOCK_MS);
  const locked = await state
    .findOneAndUpdate(
      { _id: "monitor", lockedUntil: { $lt: now } },
      { $set: { lockedUntil: until } },
      { returnDocument: "after" },
    )
    .catch(() => null);
  if (locked) return true;
  return state
    .insertOne({ _id: "monitor", lockedUntil: until })
    .then(() => true)
    .catch(() => false);
}

/** One monitor run: health-check every service with active agreements, then settle. */
export async function runTick() {
  const now = new Date();
  const result = { ok: true, checked: 0, settled: 0, errors: [], at: now.toISOString() };
  const { checks, settlements, state } = await connect();

  if (!(await takeLock(state, now))) return { ...result, skipped: "Another run is in progress." };

  try {
    const market = await readMarket();
    const active = market.agreements.filter((a) => a.status === AgreementStatus.Active);

    // 1. Health checks: one per service that has active agreements.
    const watched = [...new Set(active.map((a) => a.serviceId))]
      .map((id) => market.services.get(id))
      .filter(Boolean);
    const probes = await Promise.all(watched.map(async (s) => ({ s, r: await probe(s.endpoint) })));
    if (probes.length)
      await checks.insertMany(
        probes.map(({ s, r }) => ({ serviceId: s.id, endpoint: s.endpoint, at: now, ...r })),
      );
    result.checked = probes.length;

    // 2. Settlement: needs the monitor key, and it must be the contract's monitor.
    if (!account) {
      result.skipped = "MONITOR_PRIVATE_KEY is not set, so agreements are not settled.";
      return result;
    }
    if (account.address.toLowerCase() !== market.monitor.toLowerCase()) {
      result.skipped = `Monitor key ${account.address} is not the contract monitor ${market.monitor}. Call setMonitor first.`;
      return result;
    }

    // The contract compares against block time, so "ended" uses chain time too.
    const block = await publicClient.getBlock();
    const chainNow = Number(block.timestamp) * 1000;

    for (const a of active) {
      const service = market.services.get(a.serviceId);
      if (!service) continue;
      const window = await checks
        .find({ serviceId: a.serviceId, at: { $gte: new Date(a.start), $lte: new Date(a.end) } })
        .toArray();
      // A short plan can end between two runs: use the first check after the end.
      if (!window.length && chainNow >= a.end) {
        const after = await checks
          .find({ serviceId: a.serviceId, at: { $gte: new Date(a.end) } })
          .sort({ at: 1 })
          .limit(1)
          .toArray();
        window.push(...after);
      }

      const m = measure(service, a, window);
      const ended = chainNow >= a.end;
      let slaMet = null;
      let reason = "";
      if (m.budgetExceeded) {
        slaMet = false;
        reason = `${m.failed} failed checks exceeded the allowed downtime.`;
      } else if (ended) {
        slaMet = m.uptimeOk && m.latencyOk;
        reason = slaMet
          ? "Uptime and p95 latency met their targets."
          : !m.uptimeOk
            ? `Uptime ${(m.uptimeBps / 100).toFixed(2)}% was below ${service.uptimeBps / 100}%.`
            : `p95 latency ${m.p95LatencyMs ?? "—"}ms was above ${service.maxLatencyMs}ms.`;
      }
      if (slaMet === null) continue;

      try {
        const txHash = await settleAgreement(a.id, slaMet);
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
        result.errors.push(`Agreement #${a.id}: ${String(e?.message ?? e).split("\n")[0]}`);
      }
    }
    return result;
  } catch (e) {
    result.ok = false;
    result.errors.push(String(e?.message ?? e).split("\n")[0]);
    return result;
  } finally {
    // The web app reads this document to show "last check" and the interval.
    await state
      .updateOne(
        { _id: "monitor" },
        {
          $set: {
            lastRunAt: now,
            lastResult: result,
            intervalMs: INTERVAL_MS,
            monitorAddress: account?.address ?? null,
            network: NETWORK,
            contract: SLAFORGE_ADDRESS,
          },
        },
      )
      .catch(() => {});
  }
}

/** Last run, as stored in MongoDB. */
export async function status() {
  const { state } = await connect();
  const doc = await state.findOne({ _id: "monitor" });
  return {
    network: NETWORK,
    contract: SLAFORGE_ADDRESS,
    monitorAddress: account?.address ?? null,
    intervalMs: INTERVAL_MS,
    lastRunAt: doc?.lastRunAt?.toISOString() ?? null,
    lastResult: doc?.lastResult ?? null,
  };
}
