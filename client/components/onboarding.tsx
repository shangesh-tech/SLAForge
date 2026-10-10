"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PenLine,
  Server,
  ShoppingBag,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { shortAddress } from "@/lib/utils";
import { ConfirmModal } from "./ui";
import { useStore } from "./store";

const roles = [
  {
    role: "Customer" as const,
    icon: ShoppingBag,
    title: "I want to use services",
    text: "Buy APIs and digital services with USDC, backed by an SLA.",
    points: [
      "Pay per plan in USDC",
      "Full refund if the SLA is missed",
      "Track every agreement",
    ],
  },
  {
    role: "Provider" as const,
    icon: Server,
    title: "I provide a service",
    text: "List your API, post a bond, and earn USDC for performance.",
    points: [
      "List services with your own SLA",
      "Get paid when the SLA is met",
      "Manage bonds and payouts",
    ],
  },
];

/** First-time registration for a newly connected wallet. */
export function Onboarding() {
  const { wallet, onboardingOpen, closeOnboarding, saveProfile, busy } =
    useStore();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<Profile>({
    name: "",
    email: "",
    website: "",
    role: "Customer",
    type: "Developer",
  });
  const [picked, setPicked] = useState(false);
  if (!onboardingOpen || !wallet) return null;
  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await saveProfile(
      draft,
      `Welcome to SLAForge${draft.name ? `, ${draft.name.split(" ")[0]}` : ""}.`,
    );
    if (!ok) return;
    closeOnboarding();
    setStep(1);
    router.push(draft.role === "Provider" ? "/dashboard/provider" : "/services");
  }

  return (
    <ConfirmModal
      title={step === 1 ? "Welcome to SLAForge" : "Tell us about you"}
      onClose={closeOnboarding}
    >
      <div className="onboarding">
        <div className="onboarding-progress" aria-label={`Step ${step} of 2`}>
          <span className="done" />
          <span className={step === 2 ? "done" : ""} />
          <small>Step {step} of 2</small>
        </div>
        {step === 1 ? (
          <>
            <p className="body-copy">
              New wallet detected{" "}
              <code className="onboarding-wallet">{shortAddress(wallet)}</code>.
              How will you use SLAForge?
            </p>
            <div className="role-options" role="radiogroup" aria-label="Role">
              {roles.map(({ role, icon: Icon, title, text, points }) => (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={picked && draft.role === role}
                  className={`role-card ${picked && draft.role === role ? "selected" : ""}`}
                  onClick={() => {
                    set({ role });
                    setPicked(true);
                  }}
                >
                  <span className="role-card-icon">
                    <Icon size={20} strokeWidth={1.6} />
                  </span>
                  <span className="role-card-check">
                    {picked && draft.role === role && <Check size={13} />}
                  </span>
                  <small>{role.toUpperCase()}</small>
                  <strong>{title}</strong>
                  <p>{text}</p>
                  <ul>
                    {points.map((p) => (
                      <li key={p}>
                        <Check size={13} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button button-dark full-width"
              disabled={!picked}
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="onboarding-skip"
              onClick={closeOnboarding}
            >
              Not now
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="form-grid">
              <label className="field full-span">
                {draft.type === "Company" ? "Company name" : "Your name"}
                <input
                  required
                  minLength={2}
                  maxLength={70}
                  autoFocus
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder={draft.type === "Company" ? "e.g. Streamlet Labs" : "e.g. Alex Morgan"}
                />
              </label>
              <label className="field full-span">
                Email
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={draft.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="you@example.com"
                />
                <small>Private. Never shown to other users.</small>
              </label>
              <label className="field full-span">
                <span>
                  Website <span className="optional-tag">· Optional</span>
                </span>
                <input
                  type="url"
                  maxLength={200}
                  value={draft.website}
                  onChange={(e) => set({ website: e.target.value })}
                  placeholder="https://"
                />
              </label>
              <div className="field full-span">
                Account type
                <div className="segmented-control" role="group">
                  {(["Developer", "Company"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={draft.type === t ? "selected" : ""}
                      aria-pressed={draft.type === t}
                      onClick={() => set({ type: t })}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="onboarding-summary">
              <span>
                <small>ROLE</small>
                <strong>{draft.role}</strong>
              </span>
              <button type="button" className="text-link" onClick={() => setStep(1)}>
                Change
              </button>
            </div>
            <div className="onboarding-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button className="button button-dark" type="submit" disabled={busy}>
                <PenLine size={16} />
                {busy ? "Check your wallet…" : "Sign & create profile"}
              </button>
            </div>
            <p className="secure-note">
              Your wallet asks you to sign a message. It&apos;s free and sends
              no transaction.
            </p>
          </form>
        )}
      </div>
    </ConfirmModal>
  );
}
