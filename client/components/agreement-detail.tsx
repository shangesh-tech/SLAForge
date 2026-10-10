"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Gauge,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock3,
  Hourglass,
  Info,
  LockKeyhole,
  Radio,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { LatencyIcon, UptimeIcon } from "./icons";
import { useStore } from "./store";
import { AppShell } from "./navigation";
import {
  CopyButton,
  Countdown,
  EmptyState,
  LoadingSkeleton,
  MetricCard,
  ServiceMark,
  SettlementBreakdown,
  SLAProgress,
  StatusBadge,
} from "./ui";
import { date, platformFee, sameAddress, shortAddress, usdc } from "@/lib/utils";
import { explorerAddress, explorerTx } from "@/lib/web3/config";

/** True once the agreement's service period is over. */
function useEnded(end: string | null) {
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    if (!end) return;
    const check = () => setEnded(Date.now() >= new Date(end).getTime());
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [end]);
  return ended;
}

export function AgreementDetail({ id }: { id: string }) {
  const { agreements, services, ready, wallet, balance, busy, withdraw } =
    useStore();
  const [picked, setPreview] = useState<"Passed" | "Failed" | null>(null);
  const a = agreements.find((v) => v.id === id);
  const ended = useEnded(a?.end ?? null);
  const live = useMonitoring(id, a?.status);
  if (!ready)
    return (
      <AppShell>
        <LoadingSkeleton />
      </AppShell>
    );
  const s = a && services.find((v) => v.id === a.serviceId);
  if (!a || !s)
    return (
      <AppShell>
        <EmptyState
          title="Agreement not found"
          description="Check the agreement ID or return to your workspace."
        />
        <Link className="button button-dark" href="/dashboard/customer">
          Your agreements
        </Link>
      </AppShell>
    );
  const active = a.status === "Active";
  const finished = !active;
  const failed = a.status === "Failed";
  const plan = s.plans.find((p) => p.id === a.planId);
  // What the monitor's checks point to right now (null until there is data).
  const verdict: "Passed" | "Failed" | null =
    live && live.total > 0
      ? live.uptimePercent! >= s.uptime &&
        live.p95LatencyMs !== null &&
        live.p95LatencyMs <= s.latency
        ? "Passed"
        : "Failed"
      : null;
  const preview = picked ?? verdict ?? "Passed";
  const isCustomer = sameAddress(wallet, a.customer);
  const isProvider = sameAddress(wallet, a.provider);
  const canWithdraw =
    !!balance?.claimable &&
    ((failed && isCustomer) || (a.status === "Passed" && isProvider));
  return (
    <AppShell>
      <div id="main-content">
        <div className="agreement-breadcrumb">
          <Link className="back-link" href="/dashboard/customer">
            <ArrowLeft size={15} />
            Your agreements
          </Link>
          <span>/</span>
          <span>Agreement #{a.id}</span>
          <CopyButton value={a.id} label="Copy agreement ID" />
        </div>
        <div className="page-heading agreement-heading">
          <div>
            <h1>
              {s.name}
              <span className="agreement-heading-id">#{a.id}</span>
            </h1>
            <p>
              {plan?.name ?? "Plan"} · Started {date(a.start)}
            </p>
          </div>
          <StatusBadge status={a.status} />
        </div>
        <div className="agreement-lifecycle">
          {[
            { label: "Service bonded", done: true },
            { label: "Agreement funded", done: true },
            { label: "SLA monitoring", done: true },
            { label: "Settlement", done: finished },
          ].map((step, i) => (
            <div
              key={step.label}
              className={`${step.done ? "done" : ""} ${active && i === 2 ? "current" : ""}`}
            >
              <span>
                {step.done ? (
                  active && i === 2 ? (
                    <Gauge size={15} />
                  ) : (
                    <Check size={15} />
                  )
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <strong>{step.label}</strong>
              {i < 3 && <i />}
            </div>
          ))}
        </div>
        {finished && (
          <div
            className={`state-callout ${failed ? "failed-callout" : "passed-callout"}`}
          >
            {failed ? <TriangleAlert size={23} /> : <CheckCheck size={23} />}
            <div>
              <strong>
                {failed
                  ? "SLA missed. The payment was refunded."
                  : "Promise kept. Agreement settled."}
              </strong>
              <p>
                {failed
                  ? `${usdc(a.price)} was credited back to the customer. The provider was not paid, the service bond was slashed to the platform treasury, and the service is suspended until it is re-bonded.`
                  : `${usdc(a.price)} was credited to the provider and the service bond stays locked.`}
              </p>
              {live?.settlement && (
                <p className="callout-measured">
                  Monitor result: {live.settlement.reason} Measured{" "}
                  {live.settlement.uptimePercent.toFixed(2)}% uptime ·{" "}
                  {live.settlement.p95LatencyMs ?? "—"}ms p95 ·{" "}
                  {live.settlement.checks} checks.{" "}
                  <a
                    className="text-link"
                    href={explorerTx(live.settlement.txHash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View settlement tx <ArrowUpRight size={13} />
                  </a>
                </p>
              )}
            </div>
            {canWithdraw && (
              <button
                className="button button-dark"
                disabled={busy}
                onClick={() => withdraw()}
              >
                Withdraw {usdc(balance!.claimable)}
              </button>
            )}
          </div>
        )}
        {active && ended && (
          <div className="state-callout passed-callout">
            <Hourglass size={23} />
            <div>
              <strong>Service period complete.</strong>
              <p>
                The monitor settles this agreement automatically on its next
                run. The payment stays locked in the contract until then.
              </p>
            </div>
          </div>
        )}
        <div className="metric-grid agreement-metrics">
          <MetricCard
            label="Service payment"
            value={usdc(a.price)}
            note={
              active
                ? "Held by the contract until settlement"
                : failed
                  ? "Refunded to the customer"
                  : "Paid to the provider"
            }
            icon={<LockKeyhole size={17} />}
          />
          <MetricCard
            label="Service bond"
            value={failed ? "Slashed" : usdc(s.bond)}
            note={
              failed
                ? "Sent to the platform treasury"
                : s.bondStatus === "Bonded"
                  ? "Locked by the provider"
                  : s.bondStatus === "Slashed"
                    ? "Slashed after another SLA breach"
                    : "Refunded on delisting"
            }
            icon={<ShieldCheck size={17} />}
          />
          <MetricCard
            label="Platform fee"
            value={usdc(platformFee)}
            note={`Customer total: ${usdc(a.price + platformFee)}`}
            icon={<Info size={17} />}
          />
          <MetricCard
            label={active && !ended ? "Time remaining" : "Service period ended"}
            value={
              active && !ended ? (
                <Countdown end={a.end} />
              ) : (
                <span className="date-value">{date(a.end)}</span>
              )
            }
            note={
              !active
                ? "Outcome recorded on Arc"
                : ended
                  ? "Awaiting automatic settlement"
                  : `Ends ${date(a.end)}`
            }
            icon={<Clock3 size={17} />}
          />
        </div>
        <div className="agreement-detail-grid">
          <div className="detail-main">
            <section className="panel">
              <div className="panel-heading">
                <h2>The promise, in numbers.</h2>
                <span className="simulation-label">
                  <i className="live-dot" />
                  {!active ? "Settled" : ended ? "Awaiting settlement" : "Being monitored"}
                </span>
              </div>
              <div className="sla-targets">
                <div>
                  <UptimeIcon size={20} />
                  <small>MINIMUM UPTIME</small>
                  <strong>
                    {s.uptime}
                    <span>%</span>
                  </strong>
                  <p>Successful health checks</p>
                </div>
                <div>
                  <LatencyIcon size={20} />
                  <small>MAXIMUM P95 LATENCY</small>
                  <strong>
                    {s.latency}
                    <span>ms</span>
                  </strong>
                  <p>95th percentile response time</p>
                </div>
              </div>
              {live && live.total > 0 ? (
                <>
                  <div className="sla-progress-grid">
                    <SLAProgress
                      label="Measured uptime"
                      value={`${live.uptimePercent!.toFixed(2)}%`}
                      target={`Minimum ${s.uptime}%`}
                      good={live.uptimePercent! >= s.uptime}
                    />
                    <SLAProgress
                      label="Measured p95 latency"
                      value={live.p95LatencyMs === null ? "—" : `${live.p95LatencyMs}ms`}
                      target={`Maximum ${s.latency}ms`}
                      good={live.p95LatencyMs !== null && live.p95LatencyMs <= s.latency}
                    />
                  </div>
                  <div className="check-metrics">
                    <div>
                      <small>Total checks</small>
                      <strong>{live.total}</strong>
                    </div>
                    <div>
                      <small>Successful</small>
                      <strong className="text-success">
                        {live.total - live.failed}
                      </strong>
                    </div>
                    <div>
                      <small>Failed</small>
                      <strong className={live.failed ? "text-danger" : ""}>
                        {live.failed}
                      </strong>
                    </div>
                    <div>
                      <small>Check interval</small>
                      <strong>
                        {live.monitor.intervalMs % 60_000 === 0
                          ? live.monitor.intervalMs / 60_000
                          : live.monitor.intervalMs / 1000}
                        <span>{live.monitor.intervalMs % 60_000 === 0 ? "min" : "sec"}</span>
                      </strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="info-box">
                  <Radio size={17} />
                  <p>
                    {active
                      ? "Waiting for the first health check. "
                      : "No health checks were recorded for this agreement. "}
                    The SLAForge monitor checks <code>{s.endpoint}</code> every
                    few seconds to minutes and settles the agreement on-chain
                    automatically.
                  </p>
                </div>
              )}
              <MonitorStatusLine status={live?.monitor ?? null} />
            </section>
            {live && live.checks.length > 0 && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Recent health checks</h2>
                  <span className="muted-label">
                    Every {everyLabel(live.monitor.intervalMs)}
                  </span>
                </div>
                <div className="table-scroll">
                  <table className="checks-table">
                    <thead>
                      <tr>
                        <th>CHECK TIME</th>
                        <th>RESPONSE</th>
                        <th>STATUS</th>
                        <th>RESULT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {live.checks.map((c) => (
                        <tr key={c.at}>
                          <td>{new Date(c.at).toLocaleTimeString("en-US")}</td>
                          <td>{c.latencyMs === null ? "—" : `${c.latencyMs}ms`}</td>
                          <td>{c.status ?? c.error}</td>
                          <td>
                            <span className={`check-result ${c.ok ? "" : "failed"}`}>
                              {c.ok ? <Check size={13} /> : <X size={13} />}
                              {c.ok ? "Up" : "Down"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            <section className="panel">
              <div className="panel-heading">
                <h2>Agreement details</h2>
                <ShieldCheck size={18} />
              </div>
              <dl className="detail-list agreement-facts">
                <div>
                  <dt>Agreement ID</dt>
                  <dd>
                    #{a.id}
                    <CopyButton value={a.id} />
                  </dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>
                    <Link className="text-link" href={`/services/${s.id}`}>
                      {s.name}
                      <ArrowUpRight size={14} />
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Provider wallet</dt>
                  <dd>
                    <a
                      className="text-link"
                      href={explorerAddress(a.provider)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <code>{shortAddress(a.provider)}</code>
                    </a>
                    <CopyButton value={a.provider} />
                  </dd>
                </div>
                <div>
                  <dt>Customer wallet</dt>
                  <dd>
                    <a
                      className="text-link"
                      href={explorerAddress(a.customer)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <code>{shortAddress(a.customer)}</code>
                    </a>
                    <CopyButton value={a.customer} />
                  </dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{plan?.name ?? `Plan ${a.planId}`}</dd>
                </div>
                <div>
                  <dt>Starts</dt>
                  <dd>{date(a.start)}</dd>
                </div>
                <div>
                  <dt>Ends</dt>
                  <dd>{date(a.end)}</dd>
                </div>
                <div>
                  <dt>Uptime requirement</dt>
                  <dd>≥ {s.uptime}%</dd>
                </div>
                <div>
                  <dt>p95 latency requirement</dt>
                  <dd>≤ {s.latency}ms</dd>
                </div>
              </dl>
            </section>
          </div>
          <aside className="agreement-aside">
            <section className="panel settlement-panel">
              <div className="panel-heading">
                <h2>{finished ? "Final settlement" : "Settlement outlook"}</h2>
                <ShieldCheck size={19} />
              </div>
              {!finished && (
                <>
                  <p className="helper">
                    {verdict
                      ? `Based on the checks so far, this agreement is heading for "${verdict === "Passed" ? "SLA met" : "SLA missed"}". Preview both outcomes:`
                      : "Preview both outcomes for this agreement."}
                  </p>
                  <div className="segmented-control outcome-tabs">
                    <button
                      className={preview === "Passed" ? "selected" : ""}
                      onClick={() => setPreview("Passed")}
                    >
                      <Check size={13} />
                      SLA met
                    </button>
                    <button
                      className={preview === "Failed" ? "selected" : ""}
                      onClick={() => setPreview("Failed")}
                    >
                      <X size={13} />
                      SLA missed
                    </button>
                  </div>
                </>
              )}
              {finished && <StatusBadge status={a.status} />}
              <SettlementBreakdown
                agreement={{
                  price: a.price,
                  status: finished ? a.status : preview,
                }}
                serviceBond={failed ? null : s.bond}
              />
              <p className="secure-note">
                {finished
                  ? "Settled automatically by the SLAForge monitor"
                  : "Settles automatically when the period ends, or as soon as the SLA is breached"}
              </p>
            </section>
            <section className="agreement-service-note">
              <ServiceMark service={s} />
              <div>
                <strong>{s.provider}</strong>
                <small>{s.category} service provider</small>
              </div>
              <Link aria-label="View service" href={`/services/${s.id}`}>
                <ArrowUpRight size={18} />
              </Link>
            </section>
            <div className="aside-note">
              <Info size={16} />
              <p>
                Both uptime and p95 latency must meet their targets. A missed
                SLA refunds the customer in full and slashes the provider&apos;s
                service bond.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

type MonitorStatus = {
  intervalMs: number;
  lastRunAt: string | null;
  lastResult: { skipped?: string; errors: string[] } | null;
};
type Monitoring = {
  checks: {
    at: string;
    ok: boolean;
    status: number | null;
    latencyMs: number | null;
    error: string | null;
  }[];
  total: number;
  failed: number;
  uptimePercent: number | null;
  p95LatencyMs: number | null;
  settlement: {
    slaMet: boolean;
    reason: string;
    uptimePercent: number;
    p95LatencyMs: number | null;
    checks: number;
    failedChecks: number;
    txHash: string;
    at: string;
  } | null;
  monitor: MonitorStatus;
};

const everyLabel = (ms: number) =>
  ms % 60_000 === 0
    ? `${ms / 60_000} minute${ms === 60_000 ? "" : "s"}`
    : `${ms / 1000} seconds`;

/** Live monitoring data from the SLAForge monitor, refreshed every 15 seconds. */
function useMonitoring(id: string, status?: string) {
  const [data, setData] = useState<Monitoring | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(`/api/monitor/agreements/${id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && d && setData(d))
        .catch(() => {});
    load();
    const timer = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, status]);
  return data;
}

function MonitorStatusLine({ status }: { status: MonitorStatus | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 5_000);
    return () => clearInterval(timer);
  }, []);
  if (!status || !now) return null;
  const last = status.lastRunAt ? new Date(status.lastRunAt).getTime() : null;
  const online = last !== null && now - last < status.intervalMs * 2.5;
  const seconds = last === null ? 0 : Math.max(0, Math.round((now - last) / 1000));
  const agoLabel =
    seconds < 5 ? "just now" : seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)} min ago`;
  // The monitor can check endpoints but not settle when its wallet isn't
  // authorized on the contract (or a settlement failed). Say so plainly.
  const blocked =
    status.lastResult?.skipped && !/in progress/i.test(status.lastResult.skipped)
      ? status.lastResult.skipped
      : status.lastResult?.errors?.[0];
  return (
    <>
      <p className={`monitor-status ${online ? "" : "offline"}`}>
        <i className="live-dot" />
        {online
          ? `Monitor online · last check ${agoLabel}`
          : "Monitor offline · checks resume when the monitor runs"}
      </p>
      {online && blocked && (
        <p className="monitor-blocked">
          Health checks are running, but agreements can&apos;t be settled yet:{" "}
          {blocked}
        </p>
      )}
    </>
  );
}
