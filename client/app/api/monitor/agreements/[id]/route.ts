import type { NextRequest } from "next/server";
import { readAgreement } from "@/lib/web3/slaforge";
import { collections, measure, monitorStatus } from "@/lib/server/monitor";

/** Live monitoring data for one agreement: its checks, uptime, p95 and settlement. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return Response.json({ error: "Invalid agreement id." }, { status: 400 });
  const found = await readAgreement(id);
  if (!found) return Response.json({ error: "Agreement not found." }, { status: 404 });
  const { agreement, service } = found;
  const { checks, settlements } = await collections();
  const window = await checks
    .find({
      serviceId: agreement.serviceId,
      at: { $gte: new Date(agreement.start!), $lte: new Date(agreement.end!) },
    })
    .sort({ at: -1 })
    .toArray();
  const m = measure(service, window);
  const settlement = await settlements.findOne({ _id: agreement.id });
  return Response.json({
    checks: window.slice(0, 20).map((c) => ({
      at: c.at.toISOString(),
      ok: c.ok,
      status: c.status,
      latencyMs: c.latencyMs,
      error: c.error,
    })),
    total: m.total,
    failed: m.failed,
    uptimePercent: m.total ? m.uptimeBps / 100 : null,
    p95LatencyMs: m.p95LatencyMs,
    settlement: settlement
      ? {
          slaMet: settlement.slaMet,
          reason: settlement.reason,
          uptimePercent: settlement.uptimeBps / 100,
          p95LatencyMs: settlement.p95LatencyMs,
          checks: settlement.checks,
          failedChecks: settlement.failedChecks,
          txHash: settlement.txHash,
          at: settlement.at.toISOString(),
        }
      : null,
    monitor: await monitorStatus(),
  });
}
