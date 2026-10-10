"use client";
import { useState } from "react";
import { ArrowRight, ShieldPlus } from "lucide-react";
import { ConfirmModal } from "./ui";
import { ConfidenceBadge, ConfidenceMeter } from "./confidence";
import { useStore } from "./store";
import { confidenceFor, tiers } from "@/lib/confidence";
import { maxBond, usdc } from "@/lib/utils";
import { NETWORK_NAME } from "@/lib/web3/config";
import type { Service } from "@/lib/types";

const round = (n: number) => Math.round(n * 100) / 100;

/** Adds USDC to a live service's bond (up to the 100 USDC cap) with a tier preview. */
export function TopUpModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const { topUp, busy } = useStore();
  const room = round(maxBond - service.bond);
  const current = confidenceFor(service.bond);
  // Default to the amount that reaches the next tier.
  const [amount, setAmount] = useState(String(round(current.next?.missing ?? room) || room));
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value <= room;
  const after = confidenceFor(service.bond + (valid ? value : 0));
  const shortcuts = tiers
    .filter((t) => t.min > service.bond)
    .map((t) => ({ tier: t.tier, missing: round(t.min - service.bond) }));

  return (
    <ConfirmModal title={`Top up ${service.name}`} onClose={onClose}>
      <div className="top-up">
        <div className="top-up-compare">
          <div>
            <small>NOW</small>
            <strong>{usdc(service.bond)}</strong>
            <ConfidenceBadge confidence={current} />
          </div>
          <ArrowRight size={18} aria-hidden="true" />
          <div className={after.tier !== current.tier ? "upgraded" : ""}>
            <small>AFTER TOP-UP</small>
            <strong>{usdc(service.bond + (valid ? value : 0))}</strong>
            <ConfidenceBadge confidence={after} />
          </div>
        </div>

        {shortcuts.length > 0 && (
          <div className="top-up-shortcuts" role="group" aria-label="Quick amounts">
            {shortcuts.map((s) => (
              <button
                key={s.tier}
                type="button"
                className={value === s.missing ? "selected" : ""}
                onClick={() => setAmount(String(s.missing))}
              >
                +{s.missing} USDC
                <small>to {s.tier}</small>
              </button>
            ))}
          </div>
        )}

        <label className="field">
          Amount to add (USDC)
          <input
            type="number"
            min="0.01"
            max={room}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <small>
            Up to {usdc(room)} more. The bond is capped at {usdc(maxBond)}, and
            all of it is slashed if an SLA is missed.
          </small>
        </label>

        <ConfidenceMeter confidence={after} bond={service.bond + (valid ? value : 0)} audience="provider" />

        <button
          className="button button-dark full-width"
          disabled={!valid || busy}
          onClick={async () => {
            if (await topUp(service.id, value)) onClose();
          }}
        >
          <ShieldPlus size={16} />
          {busy ? "Waiting for your wallet…" : valid ? `Add ${usdc(value)} to bond` : "Enter an amount"}
        </button>
        <p className="secure-note">
          Your wallet asks you to approve the USDC, then confirm on {NETWORK_NAME}.
          Active agreements are not affected.
        </p>
      </div>
    </ConfirmModal>
  );
}
