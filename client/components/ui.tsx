"use client";
import { ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Copy,
  Search,
  X,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Service, Status, Agreement, BondStatus } from "@/lib/types";
import { usdc, shortAddress, settlement, durationLabel } from "@/lib/utils";
import { useStore } from "./store";
import { ConfidenceBadge } from "./confidence";
import { serviceConfidence } from "@/lib/confidence";
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="eyebrow">
      <span>{"{"}</span> {children} <span>{"}"}</span>
    </div>
  );
}
export function StatusBadge({
  status,
}: {
  status: Status | BondStatus | "Online" | "Offline";
}) {
  return (
    <span
      className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {status}
    </span>
  );
}
export function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <div className="metric-value">{value}</div>
      {note && <div className="metric-note">{note}</div>}
    </div>
  );
}
export function ServiceMark({ service }: { service: Service }) {
  return (
    <div className={`service-mark ${service.color}`}>{service.letter}</div>
  );
}
export function ServiceCard({
  service,
  preview = false,
}: {
  service: Service;
  preview?: boolean;
}) {
  const pricePlan =
    service.plans.find((p) => p.minutes === 43200) ?? service.plans[0];
  const content = (
    <>
      <div className="card-top">
        <ServiceMark service={service} />
        <ConfidenceBadge confidence={serviceConfidence(service)} />
        <span className="category">{service.category}</span>
        <ArrowUpRight size={19} />
      </div>
      <h3>{service.name}</h3>
      <p className="provider-line">
        by {service.provider}
        <ShieldCheck size={13} />
      </p>
      <p className="card-description">{service.tagline}</p>
      <dl className="spec-grid">
        <div>
          <dt>Uptime</dt>
          <dd>
            {service.uptime}
            <small>%</small>
          </dd>
        </div>
        <div>
          <dt>p95</dt>
          <dd>
            ≤{service.latency}
            <small>ms</small>
          </dd>
        </div>
        <div className={service.bondStatus === "Slashed" ? "spec-warn" : ""}>
          <dt>Bond</dt>
          <dd>
            {service.bondStatus === "Slashed" ? (
              "Slashed"
            ) : (
              <>
                {service.bond.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                <small>USDC</small>
              </>
            )}
          </dd>
        </div>
      </dl>
      <div className="card-bottom">
        <span>
          <strong>{pricePlan.price}</strong> USDC{" "}
          <small>
            /{" "}
            {pricePlan.minutes === 43200
              ? "month"
              : durationLabel(pricePlan.minutes)}
          </small>
        </span>
        {service.bondStatus === "Bonded" ? (
          <span className={`available ${service.online ? "" : "degraded"}`}>
            <i className="live-dot" />
            {service.online ? "Available" : "Degraded"}
          </span>
        ) : (
          <span className="available degraded">
            <i className="live-dot" />
            {service.bondStatus === "Slashed" ? "Suspended" : "Delisted"}
          </span>
        )}
      </div>
    </>
  );
  return preview ? (
    <article className="service-card">{content}</article>
  ) : (
    <Link href={`/services/${service.id}`} className="service-card">
      {content}
    </Link>
  );
}
export function PlanCard({
  name,
  price,
  minutes,
  selected,
  onClick,
}: {
  name: string;
  price: number;
  minutes?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`plan-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${name} ${usdc(price)}`}
    >
      <span>{name}</span>
      <strong>{usdc(price)}</strong>
      {minutes !== undefined && (
        <small className="plan-duration">
          {durationLabel(minutes)} service period
        </small>
      )}
      <span className="radio">{selected && <i />}</span>
    </button>
  );
}
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { notify } = useStore();
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          notify("Clipboard unavailable. Select and copy the value manually.");
        }
      }}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
export function ConfirmModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button, input, a")?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled])",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function EmptyState({
  title = "No results found",
  description = "Try another search or adjust your filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <Search size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function LoadingSkeleton() {
  return <div className="skeleton" aria-label="Loading from Arc" />;
}
export function Countdown({ end }: { end: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  if (!end) return <span>Not started</span>;
  if (!now) return <span>Calculating…</span>;
  const total = Math.max(0, Math.floor((new Date(end).getTime() - now) / 1000));
  return (
    <span>
      {Math.floor(total / 86400)}d {Math.floor(total / 3600) % 24}h{" "}
      {Math.floor(total / 60) % 60}m {total % 60}s
    </span>
  );
}
export function SLAProgress({
  label,
  value,
  target,
  good,
}: {
  label: string;
  value: string;
  target: string;
  good: boolean;
}) {
  return (
    <div className="sla-progress">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className={`progress-track ${good ? "" : "bad"}`}>
        <i style={{ width: good ? "98%" : "65%" }} />
      </div>
      <small>
        {target} · {good ? "Within SLA" : "SLA breached"}
      </small>
    </div>
  );
}
export function AgreementCard({
  agreement,
  service,
}: {
  agreement: Agreement;
  service?: Service;
}) {
  return (
    <Link className="agreement-row" href={`/agreements/${agreement.id}`}>
      <div className="agreement-service">
        {service && <ServiceMark service={service} />}
        <div>
          <strong>{service?.name}</strong>
          <small>
            Agreement #{agreement.id} · {shortAddress(agreement.customer)}
          </small>
        </div>
      </div>
      <span className="row-price">{usdc(agreement.price)}</span>
      <StatusBadge status={agreement.status} />
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function SettlementBreakdown({
  agreement,
  serviceBond,
}: {
  agreement: Pick<Agreement, "price" | "status">;
  /** null when the slashed amount is not known (an agreement already settled). */
  serviceBond: number | null;
}) {
  const s = settlement(agreement, serviceBond ?? 0),
    failed = agreement.status === "Failed",
    bond = serviceBond === null ? "service bond" : `${usdc(serviceBond)} service bond`;
  return (
    <div className="settlement">
      <div className="money-flow">
        <div>
          <small>Customer paid</small>
          <strong>{usdc(agreement.price)}</strong>
        </div>
        <ArrowRight size={20} />
        <div>
          <small>{failed ? "Customer refunded" : "Provider credited"}</small>
          <strong>{usdc(failed ? s.refund : s.provider)}</strong>
        </div>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Provider service payout</dt>
          <dd>{usdc(s.provider)}</dd>
        </div>
        <div>
          <dt>Customer refund</dt>
          <dd>{usdc(s.refund)}</dd>
        </div>
        <div>
          <dt>Service bond slashed → treasury</dt>
          <dd>{failed && serviceBond === null ? "Full bond" : usdc(s.slashedBond)}</dd>
        </div>
        <div>
          <dt>Platform fee</dt>
          <dd>{usdc(s.fee)}</dd>
        </div>
      </dl>
      <p className="helper">
        {failed
          ? `The SLA was missed. The customer is credited a full refund, the provider is not paid, and the provider's full ${bond} is slashed to the platform treasury. The service is suspended until the provider posts a new bond.`
          : `The SLA was met. The provider is credited the payment and the ${bond} stays locked.`}{" "}
        Credited USDC is withdrawn from the wallet menu.
      </p>
    </div>
  );
}
/** A soft two-tone gradient that is unique to each wallet address. */
export function WalletAvatar({ address, size = 32 }: { address: string; size?: number }) {
  const hex = address.slice(2).toLowerCase();
  const hue = (i: number) => (parseInt(hex.slice(i, i + 4), 16) || 0) % 360;
  const a = hue(0),
    b = (a + 40 + (hue(8) % 120)) % 360;
  return (
    <span
      className="wallet-avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, hsl(${b} 80% 88%), transparent 60%), linear-gradient(135deg, hsl(${a} 55% 62%), hsl(${b} 50% 42%))`,
      }}
    />
  );
}
