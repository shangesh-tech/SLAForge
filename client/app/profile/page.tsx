"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Pencil,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { AppShell, WalletButton } from "@/components/navigation";
import { CopyButton } from "@/components/ui";
import { useStore } from "@/components/store";
import { Profile } from "@/lib/types";
import { shortAddress } from "@/lib/utils";
export default function ProfilePage() {
  const { profile, wallet, saveProfile } = useStore();
  const [draft, setDraft] = useState<Profile | null>(null);
  const editing = draft !== null;
  const display = draft ?? profile;
  return (
    <AppShell>
      <div id="main-content">
        <div className="page-heading">
          <div>
            <h1>A little more about you.</h1>
            <p>Your profile connects your wallet to the work you do.</p>
          </div>
          {!editing && (
            <button
              className="button button-outline"
              onClick={() => setDraft({ ...profile })}
            >
              <Pencil size={15} />
              Edit profile
            </button>
          )}
        </div>
        <div className="profile-grid">
          <section className="profile-card">
            <div className="profile-cover">
              <div className="profile-orbit" />
            </div>
            <div className="profile-card-body">
              <div className="avatar">
                {profile.name
                  .split(" ")
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")}
              </div>
              <h2>{profile.name}</h2>
              <p>
                {profile.type} · {profile.role}
              </p>
              <span className="status status-active">
                <i />
                Demo account
              </span>
              <div className="profile-card-wallet">
                <Wallet size={16} />
                <span>
                  {wallet ? shortAddress(wallet) : "Wallet not connected"}
                </span>
                {wallet && <CopyButton value={wallet} />}
              </div>
              <Link
                className="text-link"
                href={
                  profile.role === "Provider"
                    ? "/dashboard/provider"
                    : "/dashboard/customer"
                }
              >
                Open your workspace <ArrowUpRight size={15} />
              </Link>
            </div>
          </section>
          <div className="profile-details">
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft) {
                  saveProfile({
                    ...draft,
                    name: draft.name.trim(),
                    email: draft.email.trim(),
                    website: draft.website.trim(),
                  });
                  setDraft(null);
                }
              }}
            >
              <div className="panel-heading">
                <h2>Profile information</h2>
                <UserRound size={18} />
              </div>
              <div className="form-grid">
                <label className="field">
                  Name
                  <input
                    readOnly={!editing}
                    required
                    minLength={2}
                    maxLength={70}
                    value={display.name}
                    onChange={(e) =>
                      setDraft((v) => v && { ...v, name: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Email
                  <input
                    type="email"
                    readOnly={!editing}
                    required
                    value={display.email}
                    onChange={(e) =>
                      setDraft((v) => v && { ...v, email: e.target.value })
                    }
                  />
                </label>
                <label className="field full-span">
                  Website
                  <input
                    type="url"
                    readOnly={!editing}
                    value={display.website}
                    onChange={(e) =>
                      setDraft((v) => v && { ...v, website: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Primary role
                  <select
                    disabled={!editing}
                    value={display.role}
                    onChange={(e) =>
                      setDraft(
                        (v) =>
                          v && {
                            ...v,
                            role: e.target.value as Profile["role"],
                          },
                      )
                    }
                  >
                    <option>Customer</option>
                    <option>Provider</option>
                  </select>
                  <small>You can explore both workspaces in the demo.</small>
                </label>
                <label className="field">
                  Account type
                  <select
                    disabled={!editing}
                    value={display.type}
                    onChange={(e) =>
                      setDraft(
                        (v) =>
                          v && {
                            ...v,
                            type: e.target.value as Profile["type"],
                          },
                      )
                    }
                  >
                    <option>Developer</option>
                    <option>Company</option>
                  </select>
                </label>
              </div>
              {editing && (
                <div className="form-actions">
                  <button
                    className="button button-outline"
                    type="button"
                    onClick={() => setDraft(null)}
                  >
                    Cancel
                  </button>
                  <button className="button button-dark" type="submit">
                    <Check size={16} />
                    Save changes
                  </button>
                </div>
              )}
            </form>
            <section className="panel">
              <div className="panel-heading">
                <h2>Your wallet</h2>
                <Wallet size={18} />
              </div>
              {wallet ? (
                <>
                  <div className="wallet-address">
                    <code>{wallet}</code>
                    <CopyButton value={wallet} />
                  </div>
                  <div className="profile-wallet-meta">
                    <span>
                      <i className="live-dot" />
                      Arc Mainnet target
                    </span>
                    <span>Simulated · 2,450.00 demo USDC</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="body-copy">
                    Connect a demo wallet to create agreements and accept
                    provider requests.
                  </p>
                  <WalletButton />
                </>
              )}
            </section>
            <div className="info-box">
              <ShieldCheck size={19} />
              <p>
                Profile data is stored locally in this browser. This frontend
                demo uses a simulated wallet and never requests your private
                key.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
