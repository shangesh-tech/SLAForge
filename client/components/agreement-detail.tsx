"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Gauge,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock3,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LockKeyhole,
  Radio,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useStore } from "./store";
import { AppShell } from "./navigation";
import {
  ConfirmModal,
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
import { PerformanceChart } from "./charts";
import { date, platformFee, shortAddress, usdc } from "@/lib/utils";
import { checks } from "@/data/mock";
export function AgreementDetail({ id }: { id: string }) {
  const { agreements, services, ready, settle, notify } = useStore();
  const [tab, setTab] = useState("Overview");
  const [reveal, setReveal] = useState(false);
  const [modal, setModal] = useState(false);
  const [outcome, setOutcome] = useState<"Passed" | "Failed">("Passed");
  const [preview, setPreview] = useState<"Passed" | "Failed">("Passed");
  const a = agreements.find((v) => v.id === id);
  if (!ready)
    return (
      <AppShell>
        <LoadingSkeleton />
      </AppShell>
    );
  if (!a)
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
  const s = services.find((v) => v.id === a.serviceId)!;
  const active = a.status === "Active";
  const finished = !active;
  const failed = a.status === "Failed";
  const apiKey = `sk_demo_${a.id.toLowerCase().replace("-", "_")}_7k9r2m4x8p6n`;
  const plan = s.plans.find((p) => p.id === a.planId);
  return (
    <AppShell>
      <div id="main-content">
        <div className="agreement-breadcrumb">
          <Link className="back-link" href="/dashboard/customer">
            <ArrowLeft size={15} />
            Your agreements
          </Link>
          <span>/</span>
          <span>{a.id}</span>
          <CopyButton value={a.id} label="Copy agreement ID" />
        </div>
        <div className="page-heading agreement-heading">
          <div>
            <h1>
              {s.name}
              <span className="agreement-heading-id">{a.id}</span>
            </h1>
            <p>
              {plan?.name ?? "Custom plan"} · Created {date(a.created)}
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
                  ? "SLA missed. Your payment was refunded."
                  : "Promise kept. Agreement settled."}
              </strong>
              <p>
                {failed
                  ? `${usdc(a.price)} was returned to the customer. ${s.provider} was not paid, its ${usdc(s.bond)} service bond was slashed to the platform treasury, and the service is suspended until it is re-bonded.`
                  : "The provider receives the service payment and the service bond stays locked."}
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
                ? "Held until settlement"
                : failed
                  ? "Refunded to the customer"
                  : "Paid to the provider"
            }
            icon={<LockKeyhole size={17} />}
          />
          <MetricCard
            label="Service bond"
            value={usdc(s.bond)}
            note={
              s.bondStatus === "Bonded"
                ? "Locked by the provider"
                : s.bondStatus === "Slashed"
                  ? "Slashed to the treasury"
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
            label={active ? "Time remaining" : "Settled on"}
            value={
              active ? (
                <Countdown end={a.end} />
              ) : (
                <span className="date-value">{date(a.end)}</span>
              )
            }
            note={
              active
                ? "Simulated monitoring is running"
                : "Final demo outcome recorded"
            }
            icon={<Clock3 size={17} />}
          />
        </div>
        <div className="tabs workspace-tabs">
          {["Overview", "Monitoring", "API access"].map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <span className="tabs-note">
            <Radio size={13} />
            Simulated measurements
          </span>
        </div>
        <div className="agreement-detail-grid">
          <div className="detail-main">
            {tab === "Overview" && (
              <>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>The promise, in numbers.</h2>
                    <span className="simulation-label">
                      <i className="live-dot" />
                      {active ? "Demo monitor" : "Final snapshot"}
                    </span>
                  </div>
                  <div className="sla-progress-grid">
                    <SLAProgress
                      label="Uptime"
                      value={`${a.uptime.toFixed(2)}%`}
                      target={`Minimum ${s.uptime}%`}
                      good={a.uptime >= s.uptime}
                    />
                    <SLAProgress
                      label="p95 latency"
                      value={`${a.latency}ms`}
                      target={`Maximum ${s.latency}ms`}
                      good={a.latency <= s.latency}
                    />
                  </div>
                  <div className="check-metrics">
                    <div>
                      <small>Total checks</small>
                      <strong>{a.checks.toLocaleString()}</strong>
                    </div>
                    <div>
                      <small>Successful</small>
                      <strong className="text-success">
                        {Math.max(
                          0,
                          a.checks - a.failedChecks,
                        ).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <small>Failed</small>
                      <strong className={a.failedChecks ? "text-danger" : ""}>
                        {a.failedChecks}
                      </strong>
                    </div>
                    <div>
                      <small>Check interval</small>
                      <strong>
                        30<span>s</span>
                      </strong>
                    </div>
                  </div>
                  <p className="helper">
                    {`Last checked: ${a.lastChecked ? date(a.lastChecked) : "Waiting for first simulated check"}. Measurements are generated locally while the app is open.`}
                  </p>
                </section>
                <div className="chart-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Uptime history</h2>
                      <span className="chart-unit">%</span>
                    </div>
                    <PerformanceChart
                      type="uptime"
                      failed={failed}
                      target={s.uptime}
                    />
                    <p className="chart-caption">
                      Illustrative 24-hour trend · Not an endpoint measurement
                    </p>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>p95 latency</h2>
                      <span className="chart-unit">ms</span>
                    </div>
                    <PerformanceChart failed={failed} target={s.latency} />
                    <p className="chart-caption">
                      Illustrative 24-hour trend · Not an endpoint measurement
                    </p>
                  </section>
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Agreement details</h2>
                    <ShieldCheck size={18} />
                  </div>
                  <dl className="detail-list agreement-facts">
                    <div>
                      <dt>Agreement ID</dt>
                      <dd>
                        {a.id}
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
                      <dt>Provider</dt>
                      <dd>{s.provider}</dd>
                    </div>
                    <div>
                      <dt>Provider wallet</dt>
                      <dd>
                        <code>{shortAddress(a.provider)}</code>
                        <CopyButton value={a.provider} />
                      </dd>
                    </div>
                    <div>
                      <dt>Customer wallet</dt>
                      <dd>
                        <code>{shortAddress(a.customer)}</code>
                        <CopyButton value={a.customer} />
                      </dd>
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
              </>
            )}
            {tab === "Monitoring" && (
              <>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Monitoring overview</h2>
                    <span className="tiny-tag">SIMULATED</span>
                  </div>
                  <div className="check-metrics">
                    <div>
                      <small>Total checks</small>
                      <strong>{a.checks.toLocaleString()}</strong>
                    </div>
                    <div>
                      <small>Successful</small>
                      <strong>
                        {Math.max(
                          0,
                          a.checks - a.failedChecks,
                        ).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <small>Failed</small>
                      <strong>{a.failedChecks}</strong>
                    </div>
                  </div>
                  <PerformanceChart failed={failed} target={s.latency} />
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Recent monitoring checks</h2>
                    <span className="muted-label">Every 30 seconds</span>
                  </div>
                  <RecentChecks
                    count={a.checks}
                    lastChecked={a.lastChecked}
                    maxLatency={s.latency}
                    failed={failed}
                  />
                </section>
              </>
            )}
            {tab === "API access" && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Your API credentials</h2>
                  <KeyRound size={19} />
                </div>
                <>
                  <p className="body-copy">
                    Use these illustrative credentials to understand the
                    integration flow. They cannot authenticate against any real
                    service.
                  </p>
                  <div className="credential">
                    <label>User ID</label>
                    <div>
                      <code>usr_demo_{a.id.toLowerCase()}</code>
                      <CopyButton
                        value={`usr_demo_${a.id.toLowerCase()}`}
                        label="Copy user ID"
                      />
                    </div>
                  </div>
                  <div className="credential">
                    <label>
                      API key <span className="tiny-tag">DEMO KEY</span>
                    </label>
                    <div>
                      <code>
                        {reveal ? apiKey : "sk_demo_••••••••••••••••••••••••"}
                      </code>
                      <button
                        className="icon-button"
                        aria-label={reveal ? "Hide API key" : "Reveal API key"}
                        onClick={() => setReveal(!reveal)}
                      >
                        {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                      <CopyButton value={apiKey} label="Copy API key" />
                    </div>
                  </div>
                  <div className="endpoint-block">
                    <span>Health endpoint</span>
                    <code>{s.endpoint}</code>
                  </div>
                  <div className="info-box">
                    <Info size={17} />
                    <p>
                      Credentials are mock values stored on this device. No
                      requests or authentication are performed by this frontend.
                    </p>
                  </div>
                </>
              </section>
            )}
            {tab === "Overview" && (
              <section className="panel recent-checks-panel">
                <div className="panel-heading">
                  <h2>Recent checks</h2>
                  <button
                    className="text-link"
                    onClick={() => setTab("Monitoring")}
                  >
                    View monitoring <ArrowRight size={15} />
                  </button>
                </div>
                <RecentChecks
                  count={Math.min(a.checks, 5)}
                  lastChecked={a.lastChecked}
                  maxLatency={s.latency}
                  failed={failed}
                />
              </section>
            )}
          </div>
          <aside className="agreement-aside">
            <section className="panel settlement-panel">
              <div className="panel-heading">
                <h2>{finished ? "Final settlement" : "Settlement outlook"}</h2>
                <ShieldCheck size={19} />
              </div>
              <>
                {!finished && (
                  <>
                    <p className="helper">
                      Preview both outcomes for this agreement.
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
                  serviceBond={s.bond}
                />
                {active && (
                  <button
                    className="button button-dark full-width"
                    onClick={() => setModal(true)}
                  >
                    Simulate settlement <ArrowRight size={16} />
                  </button>
                )}
                <p className="secure-note">
                  {finished
                    ? "Demo outcome · No funds transferred"
                    : "Simulation · Settlement runs at demo expiry"}
                </p>
              </>
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
        {modal && (
          <ConfirmModal
            title="Choose a demo outcome"
            onClose={() => setModal(false)}
          >
            <>
              <p className="body-copy">
                Finish the demo service period now and see how each outcome
                distributes the funds.
              </p>
              <div className="segmented-control outcome-tabs">
                <button
                  className={outcome === "Passed" ? "selected" : ""}
                  onClick={() => setOutcome("Passed")}
                >
                  SLA passed
                </button>
                <button
                  className={outcome === "Failed" ? "selected" : ""}
                  onClick={() => setOutcome("Failed")}
                >
                  SLA failed
                </button>
              </div>
              <SettlementBreakdown
                agreement={{ price: a.price, status: outcome }}
                serviceBond={s.bond}
              />
              <button
                className="button button-dark full-width"
                onClick={() => {
                  settle(a.id, outcome);
                  notify(
                    `Demo agreement ${outcome.toLowerCase()}. Settlement recorded locally.`,
                  );
                  setModal(false);
                }}
              >
                Record {outcome.toLowerCase()} outcome <ArrowRight size={16} />
              </button>
              <p className="secure-note">
                Sets an illustrative final measurement. No real transfer.
              </p>
            </>
          </ConfirmModal>
        )}
      </div>
    </AppShell>
  );
}
function RecentChecks({
  count,
  lastChecked,
  maxLatency,
  failed,
}: {
  count: number;
  lastChecked: string | null;
  maxLatency: number;
  failed: boolean;
}) {
  const visible = checks.slice(0, Math.min(12, count));
  if (!visible.length)
    return (
      <EmptyState
        title="Awaiting the first check"
        description="The first simulated measurement appears 30 seconds after activation."
      />
    );
  return (
    <div className="table-scroll">
      <table className="checks-table">
        <thead>
          <tr>
            <th>CHECK TIME</th>
            <th>REGION</th>
            <th>RESPONSE</th>
            <th>RESULT</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c, i) => {
            const success = failed ? i % 4 !== 0 : c.success;
            return (
              <tr key={c.id}>
                <td>
                  {lastChecked
                    ? new Date(
                        new Date(lastChecked).getTime() - c.secondsAgo * 1000,
                      ).toLocaleTimeString("en-US")
                    : `${c.secondsAgo}s ago`}
                </td>
                <td>{c.region}</td>
                <td>
                  {success
                    ? Math.round(maxLatency * 0.5 + maxLatency * 0.02 * (i % 8))
                    : "—"}
                  {success && "ms"}
                </td>
                <td>
                  <span className={`check-result ${success ? "" : "failed"}`}>
                    {success ? <Check size={13} /> : <X size={13} />}
                    {success ? "200 OK" : "Timeout"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
