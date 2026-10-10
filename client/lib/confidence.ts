import type { Service } from "./types";

/** Bond at which confidence reaches 100% (the contract's maximum bond). */
export const fullConfidenceBond = 100;

export type Tier = "Unbacked" | "Bronze" | "Silver" | "Gold" | "Platinum";

/** SLAForge badge tiers, by the USDC bond that backs a service. */
export const tiers: { tier: Exclude<Tier, "Unbacked">; min: number; text: string }[] = [
  { tier: "Bronze", min: 1, text: "Small stake behind the SLA" },
  { tier: "Silver", min: 25, text: "Solid stake behind the SLA" },
  { tier: "Gold", min: 50, text: "Strong stake behind the SLA" },
  { tier: "Platinum", min: 100, text: "Maximum confidence" },
];

export type Confidence = {
  /** 0–100: one point per USDC of bond, capped at 100. */
  score: number;
  tier: Tier;
  text: string;
  /** The next tier and the extra bond needed to reach it, if any. */
  next: { tier: Tier; missing: number } | null;
};

/** Confidence from a bond amount: 1 USDC = 1%, 100 USDC (the maximum) = 100%. */
export function confidenceFor(bond: number, backed = true): Confidence {
  if (!backed || !(bond >= tiers[0].min))
    return {
      score: 0,
      tier: "Unbacked",
      text: backed ? "No bond posted" : "Bond slashed, service suspended",
      next: { tier: "Bronze", missing: Math.max(0, tiers[0].min - (backed ? bond : 0)) },
    };
  const i = tiers.findLastIndex((t) => bond >= t.min);
  const nextTier = tiers[i + 1];
  return {
    score: Math.min(100, Math.floor((bond / fullConfidenceBond) * 100)),
    tier: tiers[i].tier,
    text: tiers[i].text,
    next: nextTier ? { tier: nextTier.tier, missing: nextTier.min - bond } : null,
  };
}

/** Confidence for a listed service; slashed or delisted services score 0. */
export const serviceConfidence = (s: Pick<Service, "bond" | "bondStatus">) =>
  confidenceFor(s.bond, s.bondStatus === "Bonded");
