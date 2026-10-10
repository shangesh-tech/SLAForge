"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Check,
  Code2,
  Eye,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  Pencil,
  Server,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import { AppShell, WalletButton } from "@/components/navigation";
import { CopyButton, LoadingSkeleton, WalletAvatar } from "@/components/ui";
import { useStore } from "@/components/store";
import { Profile } from "@/lib/types";
import { shortAddress } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");

const roleCopy = {
  Customer: { icon: ShoppingBag, text: "Buy plans backed by provider bonds." },
  Provider: { icon: Server, text: "List services and earn USDC." },
};
const typeIcons = { Developer: Code2, Company: Building2 };

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default function ProfilePage() {
  const {
    profile,
    wallet,
    registered,
    signedIn,
    busy,
    saveProfile,
    signIn,
    openOnboarding,
  } = useStore();
  const [draft, setDraft] = useState<Profile | null>(null);
  const display = draft ?? profile;
  const changed =
    !!draft &&
    (Object.keys(draft) as (keyof Profile)[]).some((k) => draft[k] !== profile[k]);
  const set = (patch: Partial<Profile>) =>
    setDraft((v) => v && { ...v, ...patch });

  async function startEditing() {
    // The email is private, so editing needs a signed-in session.
    const full = signedIn ? profile : await signIn();
    if (full) setDraft({ ...full });
  }

  if (!wallet)
    return (
      <AppShell>
        <div id="main-content">
          <ProfileHeading />
          <section className="panel payments-connect">
            <span className="payments-connect-icon">
              <UserRound size={24} />
            </span>
            <h2>Connect your wallet</h2>
            <p>
              Your SLAForge profile is linked to your wallet. Connect it to
              create or edit your profile.
            </p>
            <WalletButton />
          </section>
        </div>
      </AppShell>
    );

  if (registered === null)
    return (
      <AppShell>
        <div id="main-content">
          <ProfileHeading />
          <LoadingSkeleton />
        </div>
      </AppShell>
    );

  const checklist = [
    { done: !!profile.name, label: "Display name" },
    // The email is only known once signed in; it is required at sign-up.
    { done: !signedIn || !!profile.email, label: "Private email" },
    { done: !!profile.website, label: "Website" },
  ];
  const strength = checklist.filter((c) => c.done).length;
  const workspace =
    profile.role === "Provider" ? "/dashboard/provider" : "/dashboard/customer";
  const RoleIcon = roleCopy[display.role].icon;
  const TypeIcon = typeIcons[display.type];

  return (
    <AppShell>
      <div id="main-content">
        <ProfileHeading />

        <section className="profile-hero">
          <div className="profile-hero-cover" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="profile-hero-body">
            <div className="profile-hero-avatar">
              <WalletAvatar address={wallet} size={84} />
              <span>
                {registered && profile.name ? (
                  initials(profile.name)
                ) : (
                  <UserRound size={28} />
                )}
              </span>
            </div>
            <div className="profile-hero-id">
              <h2>{registered ? profile.name : "New wallet"}</h2>
              <div className="profile-hero-meta">
                <span className="profile-hero-address">
                  {shortAddress(wallet)}
                  <CopyButton value={wallet} label="Copy wallet address" />
                </span>
                {registered && profile.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer">
                    <Globe2 size={13} />
                    {hostOf(profile.website)}
                  </a>
                )}
              </div>
              <div className="wallet-hero-chips">
                {registered ? (
                  <>
                    <span className="chip chip-role">{profile.role}</span>
                    <span className="chip">{profile.type}</span>
                    <span className={`chip ${signedIn ? "chip-ok" : ""}`}>
                      {signedIn ? <Check size={12} /> : <LockKeyhole size={12} />}
                      {signedIn ? "Signed in" : "Signed out"}
                    </span>
                  </>
                ) : (
                  <span className="chip chip-warn">No profile yet</span>
                )}
              </div>
            </div>
            <div className="profile-hero-actions">
              {!registered ? (
                <button className="button button-dark" onClick={openOnboarding}>
                  <UserRoundPlus size={16} />
                  Create profile
                </button>
              ) : (
                !draft && (
                  <>
                    <Link className="button button-outline" href={workspace}>
                      Open workspace <ArrowUpRight size={15} />
                    </Link>
                    <button
                      className="button button-dark"
                      disabled={busy}
                      onClick={startEditing}
                    >
                      <Pencil size={15} />
                      Edit profile
                    </button>
                  </>
                )
              )}
            </div>
          </div>
        </section>

        {!registered ? (
          <section className="panel profile-create">
            <div>
              <h2>Make SLAForge yours.</h2>
              <p>
                Choose whether you buy services or provide them, and add a name
                customers can recognise. It takes a minute and one free
                signature.
              </p>
            </div>
            <div className="profile-create-roles">
              {(["Customer", "Provider"] as const).map((r) => {
                const Icon = roleCopy[r].icon;
                return (
                  <div key={r}>
                    <Icon size={18} />
                    <strong>{r}</strong>
                    <small>{roleCopy[r].text}</small>
                  </div>
                );
              })}
            </div>
            <button className="button button-dark" onClick={openOnboarding}>
              <UserRoundPlus size={16} />
              Create profile
            </button>
          </section>
        ) : (
          <div className="profile-layout">
            <div className="profile-main">
              {draft ? (
                <form
                  className="panel profile-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await saveProfile(draft)) setDraft(null);
                  }}
                >
                  <div className="panel-heading">
                    <div>
                      <h2>Edit profile</h2>
                      <p className="helper">
                        Saved to your profile after a free wallet signature.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Cancel editing"
                      onClick={() => setDraft(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <fieldset className="profile-fieldset">
                    <legend>I use SLAForge as a</legend>
                    <div
                      className="profile-role-options"
                      role="radiogroup"
                      aria-label="Role"
                    >
                      {(["Customer", "Provider"] as const).map((r) => {
                        const Icon = roleCopy[r].icon;
                        const on = draft.role === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            className={`profile-role ${on ? "selected" : ""}`}
                            onClick={() => set({ role: r })}
                          >
                            <span className="profile-role-icon">
                              <Icon size={18} strokeWidth={1.7} />
                            </span>
                            <span>
                              <strong>{r}</strong>
                              <small>{roleCopy[r].text}</small>
                            </span>
                            <span className="profile-role-check">
                              {on && <Check size={12} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {draft.role !== profile.role && (
                      <p className="profile-role-note">
                        After saving you&apos;ll use the{" "}
                        {draft.role.toLowerCase()} workspace.
                      </p>
                    )}
                  </fieldset>

                  <div className="form-grid">
                    <label className="field">
                      {draft.type === "Company" ? "Company name" : "Your name"}
                      <input
                        required
                        minLength={2}
                        maxLength={70}
                        value={draft.name}
                        autoComplete={draft.type === "Company" ? "organization" : "name"}
                        onChange={(e) => set({ name: e.target.value })}
                      />
                      <small>Shown on your services and agreements.</small>
                    </label>
                    <div className="field">
                      <span>Account type</span>
                      <div
                        className="segmented"
                        role="radiogroup"
                        aria-label="Account type"
                      >
                        {(["Developer", "Company"] as const).map((t) => {
                          const Icon = typeIcons[t];
                          return (
                            <button
                              key={t}
                              type="button"
                              role="radio"
                              aria-checked={draft.type === t}
                              className={draft.type === t ? "selected" : ""}
                              onClick={() => set({ type: t })}
                            >
                              <Icon size={15} />
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label className="field">
                      <span className="field-label-row">
                        Email
                        <em>
                          <LockKeyhole size={11} /> Private
                        </em>
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={draft.email}
                        onChange={(e) => set({ email: e.target.value })}
                      />
                      <small>Only you can see it.</small>
                    </label>
                    <label className="field">
                      <span className="field-label-row">
                        Website <em>Optional</em>
                      </span>
                      <input
                        type="url"
                        placeholder="https://"
                        autoComplete="url"
                        value={draft.website}
                        onChange={(e) => set({ website: e.target.value })}
                      />
                      <small>Helps customers see who is behind a service.</small>
                    </label>
                  </div>
                  <div className="profile-form-actions">
                    <span className={changed ? "dirty" : ""}>
                      {changed ? "You have unsaved changes" : "No changes yet"}
                    </span>
                    <button
                      className="button button-outline"
                      type="button"
                      onClick={() => setDraft(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="button button-dark"
                      type="submit"
                      disabled={busy || !changed}
                    >
                      <Check size={16} />
                      {busy ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>About you</h2>
                    <button
                      className="profile-panel-link"
                      disabled={busy}
                      onClick={startEditing}
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                  </div>
                  <dl className="profile-facts">
                    <Fact
                      icon={<UserRound size={16} />}
                      label={display.type === "Company" ? "Company name" : "Name"}
                    >
                      {display.name}
                    </Fact>
                    <Fact icon={<Mail size={16} />} label="Email" badge="Private">
                      {signedIn ? (
                        display.email || <span className="muted">Not set</span>
                      ) : (
                        <button
                          className="profile-inline-action"
                          disabled={busy}
                          onClick={() => signIn()}
                        >
                          <KeyRound size={13} />
                          Sign in to view
                        </button>
                      )}
                    </Fact>
                    <Fact icon={<Globe2 size={16} />} label="Website">
                      {display.website ? (
                        <a
                          className="text-link"
                          href={display.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {hostOf(display.website)} <ArrowUpRight size={13} />
                        </a>
                      ) : (
                        <button
                          className="profile-inline-action"
                          disabled={busy}
                          onClick={startEditing}
                        >
                          Add a website
                        </button>
                      )}
                    </Fact>
                    <Fact icon={<RoleIcon size={16} />} label="Role">
                      {display.role}
                      <small>{roleCopy[display.role].text}</small>
                    </Fact>
                    <Fact icon={<TypeIcon size={16} />} label="Account type">
                      {display.type}
                    </Fact>
                  </dl>
                </section>
              )}
            </div>

            <aside className="profile-aside">
              <section className="panel">
                <div className="panel-heading">
                  <h2>How others see you</h2>
                  <Eye size={17} />
                </div>
                <div className="profile-preview-card">
                  <WalletAvatar address={wallet} size={34} />
                  <div>
                    <strong>
                      {display.name || shortAddress(wallet)}
                      <ShieldCheck size={13} />
                    </strong>
                    <small>
                      {display.type} · {display.role}
                      {display.website ? ` · ${hostOf(display.website)}` : ""}
                    </small>
                  </div>
                </div>
                <ul className="profile-privacy">
                  <li>
                    <Eye size={14} /> Name, role, type and website are public
                  </li>
                  <li>
                    <LockKeyhole size={14} /> Your email is never shown to others
                  </li>
                </ul>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <h2>Profile strength</h2>
                  <span className="profile-strength-count">{strength}/3</span>
                </div>
                <div className="profile-meter" aria-hidden="true">
                  {checklist.map((c) => (
                    <i key={c.label} className={c.done ? "done" : ""} />
                  ))}
                </div>
                <ul className="profile-checklist">
                  {checklist.map((c) => (
                    <li key={c.label} className={c.done ? "done" : ""}>
                      <span>{c.done && <Check size={11} />}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </section>

            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ProfileHeading() {
  return (
    <div className="page-heading">
      <div>
        <h1>A little more about you.</h1>
        <p>Your profile connects your wallet to the work you do.</p>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  badge,
  children,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="profile-fact">
      <span className="profile-fact-icon">{icon}</span>
      <dt>
        {label}
        {badge && (
          <em>
            <LockKeyhole size={10} /> {badge}
          </em>
        )}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
