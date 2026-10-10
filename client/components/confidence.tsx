import type { Confidence, Tier } from "@/lib/confidence";
import { tiers } from "@/lib/confidence";
import { usdc } from "@/lib/utils";

/** SLAForge tier medal: a shield with the forge "A" mark. */
function Medal({ tier, size = 14 }: { tier: Tier; size?: number }) {
  return (
    <svg
      className={`medal medal-${tier.toLowerCase()}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 2.2 20 5.4v6.1c0 4.9-3.3 8.6-8 10.3-4.7-1.7-8-5.4-8-10.3V5.4l8-3.2Z"
        fill="var(--medal-fill)"
        stroke="var(--medal-edge)"
        strokeWidth="1.4"
      />
      <path
        d="m8.6 15.6 3.4-8 3.4 8M9.9 12.8h4.2"
        fill="none"
        stroke="var(--medal-mark)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Compact badge: tier medal, tier name and confidence score. */
export function ConfidenceBadge({
  confidence: c,
  compact = false,
}: {
  confidence: Confidence;
  compact?: boolean;
}) {
  return (
    <span
      className={`confidence-badge tier-${c.tier.toLowerCase()}`}
      title={`SLAForge ${c.tier} · ${c.score}% bond confidence`}
    >
      <Medal tier={c.tier} />
      {c.tier}
      {!compact && <b>{c.score}%</b>}
    </span>
  );
}

/** Full breakdown: score, tier ladder and what the bond means. */
export function ConfidenceMeter({
  confidence: c,
  bond,
  audience,
}: {
  confidence: Confidence;
  bond: number;
  /** Customers see what backs the service; providers see how to raise it. */
  audience: "customer" | "provider";
}) {
  return (
    <div className={`confidence-meter tier-${c.tier.toLowerCase()}`}>
      <div className="confidence-head">
        <Medal tier={c.tier} size={40} />
        <div>
          <small>SLAFORGE {c.tier.toUpperCase()}</small>
          <strong>
            {c.score}
            <span>% confidence</span>
          </strong>
        </div>
      </div>
      <div
        className="confidence-track"
        role="meter"
        aria-label="Bond confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={c.score}
      >
        <i style={{ width: `${c.score}%` }} />
        {tiers.slice(1).map((t) => (
          <span key={t.tier} style={{ left: `${t.min}%` }} />
        ))}
      </div>
      <ol className="confidence-ladder">
        {tiers.map((t) => (
          <li key={t.tier} className={t.tier === c.tier ? "current" : ""}>
            <Medal tier={t.tier} size={13} />
            <span>{t.tier}</span>
            <small>{t.min === 100 ? "100" : `${t.min}+`}</small>
          </li>
        ))}
      </ol>
      <p className="confidence-text">
        {c.tier === "Unbacked"
          ? c.text
          : audience === "customer"
            ? `${usdc(bond)} bond is locked behind this service. If the SLA is missed it is slashed and you get a full refund.`
            : c.next
              ? `Add ${usdc(c.next.missing)} more bond to reach ${c.next.tier}.`
              : "Top tier. Your service shows the maximum confidence badge."}
      </p>
    </div>
  );
}

/** Header score card: a ring gauge with the tier medal and bond behind it. */
export function ConfidenceScore({
  confidence: c,
  bond,
}: {
  confidence: Confidence;
  bond: number;
}) {
  const r = 30;
  const length = 2 * Math.PI * r;
  return (
    <div className={`confidence-score tier-${c.tier.toLowerCase()}`}>
      <div className="confidence-ring">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r={r} className="ring-track" />
          {c.score > 0 && (
            <circle
              cx="36"
              cy="36"
              r={r}
              className="ring-value"
              strokeDasharray={`${(c.score / 100) * length} ${length}`}
            />
          )}
        </svg>
        <span>
          {c.score}
          <small>%</small>
        </span>
      </div>
      <div className="confidence-score-text">
        <small>BOND CONFIDENCE</small>
        <strong>
          <Medal tier={c.tier} size={17} />
          SLAForge {c.tier}
        </strong>
        <p>
          {c.tier === "Unbacked" ? c.text : `${usdc(bond)} bond locked`}
        </p>
      </div>
    </div>
  );
}
