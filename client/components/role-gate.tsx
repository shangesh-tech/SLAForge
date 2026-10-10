"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Repeat2, Server, ShoppingBag } from "lucide-react";
import { AppShell } from "./navigation";
import { useStore } from "./store";

const copy = {
  Provider: {
    icon: Server,
    title: "This is the provider workspace.",
    text: "Your account is set up as a customer. Switch to a provider account to list services, post bonds, and earn USDC.",
    home: { href: "/dashboard/customer", label: "Go to my agreements" },
  },
  Customer: {
    icon: ShoppingBag,
    title: "This is the customer workspace.",
    text: "Your account is set up as a provider. Switch to a customer account to buy plans and track your agreements.",
    home: { href: "/dashboard/provider", label: "Go to provider workspace" },
  },
};

/** Shows `children` only to wallets whose role matches; others can switch. */
export function RoleGate({
  need,
  children,
}: {
  need: "Customer" | "Provider";
  children: ReactNode;
}) {
  const { role, switchRole, busy } = useStore();
  if (!role || role === need) return children;
  const { icon: Icon, title, text, home } = copy[need];
  return (
    <AppShell>
      <div id="main-content" className="role-gate">
        <span className="role-gate-icon">
          <Icon size={26} strokeWidth={1.5} />
        </span>
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="role-gate-actions">
          <button
            className="button button-dark"
            disabled={busy}
            onClick={() => switchRole(need)}
          >
            <Repeat2 size={16} />
            {busy ? "Check your wallet…" : `Switch to ${need.toLowerCase()}`}
          </button>
          <Link className="button button-outline" href={home.href}>
            {home.label} <ArrowRight size={16} />
          </Link>
        </div>
        <small>You can change your role any time in your profile.</small>
      </div>
    </AppShell>
  );
}
