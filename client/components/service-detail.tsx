"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  Globe2,
  Info,
  LockKeyhole,
  Repeat2,
  ShieldCheck,
  ShieldPlus,
} from "lucide-react";
import { LatencyIcon, MonitorIcon, UptimeIcon } from "./icons";
import { NETWORK_NAME } from "@/lib/web3/config";
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
import { ConfidenceBadge, ConfidenceMeter, ConfidenceScore } from "./confidence";
import { serviceConfidence } from "@/lib/confidence";
import { maxBond, platformFee, sameAddress, usdc } from "@/lib/utils";
import { TopUpModal } from "./top-up";
export function ServiceDetail({ id }: { id: string }) {
  const {
    services,
    ready,
    wallet,
    busy,
    balance,
    role,
    registered,
    createAgreement,
    switchRole,
    openOnboarding,
  } = useStore();
  const router = useRouter();
  const [planId, setPlanId] = useState("0");
  const [modal, setModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
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
  const ownService = sameAddress(s.providerAddress, wallet);
  const confidence = serviceConfidence(s);
  // Only customer accounts buy plans, and never from their own service.
  const blocked = ownService
    ? "own"
    : role === "Provider"
      ? "provider"
      : wallet && registered === false
        ? "unregistered"
        : null;
  return (
    <AppShell>
      <div id="main-content">
        <Link className="back-link" href="/services">
          <ArrowLeft size={15} />
          Back to services
        </Link>
        <div className="service-detail-heading">
          <ServiceMark service={s} />
          <div className="service-detail-title">
            <h1>{s.name}</h1>
            <p>
              by {s.provider} <ShieldCheck size={15} /> · {s.customers} active
              agreement{s.customers === 1 ? "" : "s"}
            </p>
            <div className="service-detail-badges">
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
          </div>
          <ConfidenceScore confidence={confidence} bond={s.bond} />
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
                  {s.bondStatus === "Bonded"
                    ? `${usdc(s.bond)} service bond`
                    : "Bond-backed service"}
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
                <small>Checked by the SLAForge monitor</small>
              </div>
              <div className="docs-block">
                <BookOpen size={19} />
                <div>
                  <strong>Service documentation</strong>
                  <a
                    className="text-link"
                    href={s.docs}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <code>{s.docs}</code>
                    <ExternalLink size={13} />
                  </a>
                  <small>Published by the provider</small>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>How much is behind this promise.</h2>
                <ConfidenceBadge confidence={confidence} />
              </div>
              <ConfidenceMeter
                confidence={confidence}
                bond={s.bond}
                audience={ownService ? "provider" : "customer"}
              />
              {ownService && s.bondStatus === "Bonded" && s.bond < maxBond && (
                <button
                  className="button button-dark confidence-top-up"
                  onClick={() => setTopUpOpen(true)}
                >
                  <ShieldPlus size={16} />
                  Top up bond
                </button>
              )}
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
                <MonitorIcon size={19} />
              </div>
              <div className="monitoring-features">
                <div>
                  <span>01</span>
                  <strong>Continuous health checks</strong>
                  <p>The monitor measures uptime and p95 response time.</p>
                </div>
                <div>
                  <span>02</span>
                  <strong>Settled automatically</strong>
                  <p>
                    No one decides by hand: the monitor settles each agreement
                    on Arc.
                  </p>
                </div>
                <div>
                  <span>03</span>
                  <strong>An auditable outcome</strong>
                  <p>
                    Every payment, refund, and slashed bond is a public
                    transaction.
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
              {s.bondStatus === "Bonded" && (
                <div className="bond-note">
                  <ShieldCheck size={17} />
                  <span>
                    {s.provider} has locked a <strong>{usdc(s.bond)}</strong>{" "}
                    bond on this service ({confidence.tier},{" "}
                    {confidence.score}% confidence). It is slashed if the SLA
                    is missed.
                  </span>
                </div>
              )}
              {s.bondStatus !== "Bonded" ? (
                <p className="helper warning">
                  {s.bondStatus === "Slashed"
                    ? "This service is suspended. Its bond was slashed after an SLA breach, and it reopens once the provider posts a new bond."
                    : "This service has been delisted by its provider."}
                </p>
              ) : blocked === "own" ? (
                <div className="buy-blocked">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>This is your service.</strong>
                    <p>
                      Providers can&apos;t buy their own services. Manage it
                      from your workspace.
                    </p>
                    <Link className="button button-outline button-sm" href="/dashboard/provider">
                      Open provider workspace <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : blocked === "provider" ? (
                <div className="buy-blocked">
                  <Info size={18} />
                  <div>
                    <strong>Provider accounts can&apos;t buy services.</strong>
                    <p>
                      Switch to a customer account to create agreements. You
                      can switch back any time.
                    </p>
                    <button
                      className="button button-dark button-sm"
                      disabled={busy}
                      onClick={() => switchRole("Customer")}
                    >
                      <Repeat2 size={14} />
                      {busy ? "Check your wallet…" : "Switch to customer"}
                    </button>
                  </div>
                </div>
              ) : blocked === "unregistered" ? (
                <button
                  className="button button-dark full-width"
                  onClick={openOnboarding}
                >
                  Create your profile to continue <ArrowRight size={16} />
                </button>
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
                {wallet && balance
                  ? `Paid in USDC on ${NETWORK_NAME} · Balance ${usdc(balance.wallet)}`
                  : `Paid in USDC on ${NETWORK_NAME}`}
              </p>
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
              Settled on {NETWORK_NAME} <ExternalLink size={13} />
            </a>
          </aside>
        </div>
        {topUpOpen && <TopUpModal service={s} onClose={() => setTopUpOpen(false)} />}
        {modal && !blocked && (
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
              disabled={!confirmed || busy}
              onClick={async () => {
                const agreementId = await createAgreement(s.id, plan.id);
                if (!agreementId) return;
                setModal(false);
                router.push(`/agreements/${agreementId}`);
              }}
            >
              {busy ? "Waiting for your wallet…" : "Fund agreement & start"}{" "}
              <ArrowRight size={16} />
            </button>
            <p className="secure-note">
              Your wallet asks you to approve {usdc(plan.price + platformFee)},
              then to confirm the agreement.
            </p>
          </ConfirmModal>
        )}
      </div>
    </AppShell>
  );
}
