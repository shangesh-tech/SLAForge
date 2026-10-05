"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  ExternalLink,
  Globe2,
  Info,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { AppShell, WalletButton } from "./navigation";
import {
  ConfirmModal,
  EmptyState,
  LoadingSkeleton,
  PlanCard,
  ServiceMark,
  StatusBadge,
} from "./ui";
import { useStore } from "./store";
import { platformFee, usdc } from "@/lib/utils";
export function ServiceDetail({ id }: { id: string }) {
  const { services, ready, wallet, createAgreement } = useStore();
  const router = useRouter();
  const [planId, setPlanId] = useState("demo");
  const [modal, setModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const s = services.find((v) => v.id === id);
  if (!ready)
    return (
      <AppShell>
        <LoadingSkeleton />
      </AppShell>
    );
  if (!s)
    return (
      <AppShell>
        <EmptyState
          title="Service not found"
          description="This service may have been removed, or the link is incorrect."
        />
        <Link href="/services" className="button button-dark">
          Browse services
        </Link>
      </AppShell>
    );
  const plan = s.plans.find((p) => p.id === planId) ?? s.plans[0];
  return (
    <AppShell>
      <div id="main-content">
        <Link className="back-link" href="/services">
          <ArrowLeft size={15} />
          Back to services
        </Link>
        <div className="service-detail-heading">
          <ServiceMark service={s} />
          <div>
            <h1>{s.name}</h1>
            <p>
              by {s.provider} <ShieldCheck size={15} /> · {s.customers} demo
              customers
            </p>
          </div>
          <StatusBadge
            status={
              s.bondStatus !== "Bonded"
                ? s.bondStatus
                : s.online
                  ? "Online"
                  : "Offline"
            }
          />
        </div>
        <div className="detail-grid">
          <div className="detail-main">
            <section className="panel">
              <div className="panel-heading">
                <h2>A foundation you can rely on.</h2>
                <span className="category">{s.category}</span>
              </div>
              <p className="body-copy">{s.description}</p>
              <div className="feature-list">
                <span>
                  <Check size={16} />
                  Measurable uptime & latency
                </span>
                <span>
                  <Check size={16} />
                  {usdc(s.bond)} service bond
                </span>
                <span>
                  <Check size={16} />
                  Transparent settlement
                </span>
                <span>
                  <Check size={16} />
                  USDC denominated plans
                </span>
              </div>
              <div className="endpoint-block">
                <span>
                  <Globe2 size={15} />
                  Health endpoint
                </span>
                <code>{s.endpoint}</code>
                <small>Illustrative endpoint · No requests are sent</small>
              </div>
              <div className="docs-block">
                <BookOpen size={19} />
                <div>
                  <strong>Service documentation</strong>
                  <code>{s.docs}</code>
                  <small>Sample documentation URL for this demo service</small>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>The service level agreement</h2>
                <ShieldCheck size={19} />
              </div>
              <p className="helper">
                These requirements are locked in when you create your agreement.
              </p>
              <div className="sla-targets">
                <div>
                  <Activity size={20} />
                  <small>MINIMUM UPTIME</small>
                  <strong>
                    {s.uptime}
                    <span>%</span>
                  </strong>
                  <p>Successful health checks</p>
                </div>
                <div>
                  <Clock3 size={20} />
                  <small>MAXIMUM P95 LATENCY</small>
                  <strong>
                    {s.latency}
                    <span>ms</span>
                  </strong>
                  <p>95th percentile response time</p>
                </div>
              </div>
              <div className="info-box">
                <Info size={17} />
                <p>
                  Both uptime and p95 latency must meet the agreed targets. A
                  breach of either requirement results in a failed SLA.
                </p>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Monitoring, made visible.</h2>
                <Activity size={19} />
              </div>
              <div className="monitoring-features">
                <div>
                  <span>01</span>
                  <strong>Checks every 30 seconds</strong>
                  <p>Scheduled health and response time measurements.</p>
                </div>
                <div>
                  <span>02</span>
                  <strong>Multi-region visibility</strong>
                  <p>Sample checks from Mumbai, Frankfurt, and Virginia.</p>
                </div>
                <div>
                  <span>03</span>
                  <strong>An auditable timeline</strong>
                  <p>
                    Check history, SLA trends, and a final settlement breakdown.
                  </p>
                </div>
              </div>
            </section>
          </div>
          <aside className="detail-aside">
            <section className="panel plan-panel">
              <h2>Choose your plan.</h2>
              <p className="helper">Start small. Build with confidence.</p>
              <div className="plan-list">
                {s.plans.map((p) => (
                  <PlanCard
                    key={p.id}
                    name={p.name}
                    price={p.price}
                    minutes={p.minutes}
                    selected={plan.id === p.id}
                    onClick={() => setPlanId(p.id)}
                  />
                ))}
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Service payment</dt>
                  <dd>{usdc(plan.price)}</dd>
                </div>
                <div>
                  <dt>Platform fee</dt>
                  <dd>{usdc(platformFee)}</dd>
                </div>
                <div className="total-row">
                  <dt>Your total</dt>
                  <dd>{usdc(plan.price + platformFee)}</dd>
                </div>
              </dl>
              <div className="bond-note">
                <ShieldCheck size={17} />
                <span>
                  {s.provider} has locked a <strong>{usdc(s.bond)}</strong> bond
                  on this service. It is slashed if the SLA is missed.
                </span>
              </div>
              {s.bondStatus !== "Bonded" ? (
                <p className="helper warning">
                  {s.bondStatus === "Slashed"
                    ? "This service is suspended. Its bond was slashed after an SLA breach, and it reopens once the provider posts a new bond."
                    : "This service has been delisted by its provider."}
                </p>
              ) : wallet ? (
                <button
                  className="button button-dark full-width"
                  onClick={() => {
                    setConfirmed(false);
                    setModal(true);
                  }}
                >
                  Create agreement <ArrowRight size={16} />
                </button>
              ) : (
                <WalletButton full />
              )}
              <p className="secure-note">
                <LockKeyhole size={12} />
                Simulated USDC · No real payment
              </p>
              {!s.online && (
                <p className="helper warning">
                  This service is currently degraded. Review its demo
                  performance before subscribing.
                </p>
              )}
            </section>
            <div className="aside-note">
              <Info size={16} />
              <p>
                Your agreement starts as soon as it is funded. If the SLA is
                missed, you get a full refund.
              </p>
            </div>
            <a
              className="aside-arc-link"
              href="https://www.arc.io/"
              target="_blank"
              rel="noreferrer"
            >
              Designed for Arc Mainnet <ExternalLink size={13} />
            </a>
          </aside>
        </div>
        {modal && (
          <ConfirmModal
            title="Review your agreement"
            onClose={() => setModal(false)}
          >
            <div className="modal-service">
              <ServiceMark service={s} />
              <div>
                <strong>{s.name}</strong>
                <p>
                  {plan.name} · {s.provider}
                </p>
              </div>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Service price</dt>
                <dd>{usdc(plan.price)}</dd>
              </div>
              <div>
                <dt>Platform fee</dt>
                <dd>{usdc(platformFee)}</dd>
              </div>
              <div className="total-row">
                <dt>Total customer payment</dt>
                <dd>{usdc(plan.price + platformFee)}</dd>
              </div>
            </dl>
            <div className="info-box">
              <ShieldCheck size={17} />
              <p>
                {s.uptime}% uptime · ≤ {s.latency}ms p95. If the SLA is missed,
                your {usdc(plan.price)} payment is refunded in full, and the
                provider&apos;s {usdc(s.bond)} service bond is slashed. The{" "}
                {usdc(platformFee)} platform fee is not refunded.
              </p>
            </div>
            <label className="checkbox-label confirmation-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I understand the SLA and the refund policy.
            </label>
            <button
              className="button button-dark full-width"
              disabled={!confirmed}
              onClick={() => {
                const agreementId = createAgreement(s, plan.id);
                setModal(false);
                router.push(`/agreements/${agreementId}`);
              }}
            >
              Fund agreement & start <ArrowRight size={16} />
            </button>
            <p className="secure-note">
              No blockchain transaction will be submitted.
            </p>
          </ConfirmModal>
        )}
      </div>
    </AppShell>
  );
}
