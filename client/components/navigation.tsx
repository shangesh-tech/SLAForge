"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useStore } from "./store";
import { CopyButton, WalletAvatar } from "./ui";
import { shortAddress, usdc } from "@/lib/utils";
import { useWallet } from "@/lib/web3/wallet";
import { explorerAddress, NETWORK_NAME } from "@/lib/web3/config";
import { friendlyError } from "@/lib/web3/errors";
import { signOut } from "@/lib/profile-api";
export function Logo() {
  return (
    <Link href="/" className="brand" aria-label="SLAForge home">
      <span className="brand-symbol">
        <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
          <path
            d="M16 2 30 10v16l-14 8L2 26V10L16 2Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m10 24 6-14 6 14M12 20h8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        SLA<span className="brand-light">Forge</span>
        <span className="brand-period">.</span>
      </span>
    </Link>
  );
}
export function WalletButton({ full = false }: { full?: boolean }) {
  const { wallet, balance, balanceFailed, withdraw, busy, notify, role } =
    useStore();
  const { openPicker, disconnect, wrongNetwork, switchNetwork, switchAccount } =
    useWallet();
  const [open, setOpen] = useState(false);
  if (wallet && wrongNetwork)
    return (
      <button
        className={`button button-danger ${full ? "full-width" : ""}`}
        onClick={() =>
          switchNetwork().catch((e) => notify(friendlyError(e)))
        }
      >
        <TriangleAlert size={16} />
        <span>Switch to {NETWORK_NAME}</span>
      </button>
    );
  const close = () => setOpen(false);
  return (
    <div className="wallet-wrap">
      <button
        className={`button ${wallet ? "button-wallet" : "button-dark"} ${full ? "full-width" : ""} ${open ? "open" : ""}`}
        aria-expanded={wallet ? open : undefined}
        aria-haspopup={wallet ? "menu" : undefined}
        onClick={() => (wallet ? setOpen(!open) : openPicker())}
      >
        {wallet ? <WalletAvatar address={wallet} size={20} /> : <Wallet size={16} />}
        <span>{wallet ? shortAddress(wallet) : "Connect wallet"}</span>
        {wallet && <ChevronDown size={14} className="wallet-chevron" />}
      </button>
      {open && wallet && (
        <>
          <button
            aria-label="Close wallet menu"
            className="menu-dismiss"
            onClick={close}
          />
          <div className="wallet-menu" role="menu">
            <div className="wallet-menu-head">
              <WalletAvatar address={wallet} size={38} />
              <div>
                <strong className="wallet-menu-address">
                  {shortAddress(wallet)}
                  <CopyButton value={wallet} label="Copy wallet address" />
                </strong>
                <small>
                  <i className="live-dot" />
                  {NETWORK_NAME}
                  {role && <span className="wallet-menu-role">{role}</span>}
                </small>
              </div>
            </div>
            <div className="wallet-menu-balance">
              <small>USDC balance</small>
              <strong>
                {balance
                  ? usdc(balance.wallet)
                  : balanceFailed
                    ? "Unavailable · retrying"
                    : "Loading…"}
              </strong>
            </div>
            {!!balance?.claimable && (
              <div className="wallet-claim">
                <span>
                  <small>Ready to withdraw</small>
                  <strong>{usdc(balance.claimable)}</strong>
                </span>
                <button
                  className="button button-dark button-sm"
                  disabled={busy}
                  onClick={() => withdraw()}
                >
                  Withdraw
                </button>
              </div>
            )}
            <nav className="wallet-menu-links" aria-label="Wallet">
              <Link href="/payments" onClick={close} role="menuitem">
                <ReceiptText size={15} />
                Payments & history
              </Link>
              <Link href="/profile" onClick={close} role="menuitem">
                <UserRound size={15} />
                View profile
              </Link>
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  switchAccount().catch((e) => notify(friendlyError(e)));
                }}
              >
                <ArrowLeftRight size={15} />
                Switch wallet account
              </button>
              <a href={explorerAddress(wallet)} target="_blank" rel="noreferrer" role="menuitem">
                <ArrowUpRight size={15} />
                View on explorer
              </a>
            </nav>
            <button
              className="wallet-menu-disconnect"
              role="menuitem"
              onClick={() => {
                signOut().catch(() => {});
                disconnect();
                close();
              }}
            >
              <LogOut size={15} />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
function NetworkPill() {
  const { wrongNetwork } = useWallet();
  return wrongNetwork ? (
    <span className="network-pill network-pill-wrong">
      <i className="live-dot" />
      Wrong <span>network</span>
    </span>
  ) : (
    <span className="network-pill">
      <i className="live-dot" />
      {NETWORK_NAME}
    </span>
  );
}
function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const getScrolled = () => window.scrollY > 32;
const getServerScrolled = () => false;

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = pathname === "/";
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    getScrolled,
    getServerScrolled,
  );
  const { role } = useStore();
  const links = [
    { href: "/services", name: "Explore services" },
    {
      href: role === "Provider" ? "/dashboard/provider" : "/dashboard/customer",
      name: "Dashboard",
    },
  ];
  return (
    <header
      className={`navbar ${home ? "navbar-home" : ""} ${home && scrolled ? "navbar-scrolled" : ""}`}
    >
      <div className="nav-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((l) => (
            <Link
              className={pathname.startsWith(l.href) ? "active" : ""}
              key={l.href}
              href={l.href}
            >
              {l.name}
              {l.name === "Explore services" && <ArrowUpRight size={14} />}
            </Link>
          ))}
        </nav>
        <div className="nav-end">
          <NetworkPill />
          <WalletButton />
          <button
            className="mobile-menu-button icon-button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {[
            ...links,
            ...(role
              ? []
              : [{ href: "/dashboard/provider", name: "Provider dashboard" }]),
            ...(role !== "Customer"
              ? [{ href: "/provider/services/new", name: "List a service" }]
              : []),
            { href: "/payments", name: "Payments" },
            { href: "/profile", name: "Profile" },
          ].map((l) => (
            <Link href={l.href} key={l.href} onClick={() => setOpen(false)}>
              {l.name}
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
const customerLink = {
  href: "/dashboard/customer",
  label: "My agreements",
  icon: LayoutDashboard,
};
const exploreLink = {
  href: "/services",
  label: "Explore services",
  icon: FolderKanban,
};
const providerLink = {
  href: "/dashboard/provider",
  label: "Provider workspace",
  icon: ShieldCheck,
};
const paymentsLink = { href: "/payments", label: "Payments", icon: ReceiptText };
const profileLink = { href: "/profile", label: "My profile", icon: UserRound };
/** Customers and providers each see their own workspace; guests see both. */
const sidebarLinksFor = (role: "Customer" | "Provider" | null) =>
  role === "Customer"
    ? [customerLink, exploreLink, paymentsLink, profileLink]
    : role === "Provider"
      ? [providerLink, exploreLink, paymentsLink, profileLink]
      : [customerLink, exploreLink, providerLink, paymentsLink, profileLink];
export function Sidebar() {
  const pathname = usePathname();
  const { role, wallet, registered, openOnboarding } = useStore();
  const sidebarLinks = sidebarLinksFor(role);
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <small>YOUR WORKSPACE</small>
        <nav aria-label="Workspace">
          {sidebarLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname.startsWith(href) ? "selected" : ""}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        {(role !== "Customer" || (wallet && registered === false)) && (
          <div className="sidebar-actions">
          {role !== "Customer" && (
            <Link className="sidebar-create" href="/provider/services/new">
              <Plus size={17} />
              List a service
            </Link>
          )}
          {wallet && registered === false && (
            <button className="sidebar-create" onClick={openOnboarding}>
              <UserRound size={17} />
              Create your profile
            </button>
          )}
          </div>
        )}
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <ShieldCheck size={22} />
          <strong>Performance is the promise.</strong>
          <p>Every service is backed by its provider’s bond.</p>
          <Link href="/#how-it-works">
            How it works <ArrowUpRight size={14} />
          </Link>
        </div>
        <a
          className="help-link"
          href="https://www.arc.io/"
          target="_blank"
          rel="noreferrer"
        >
          <CircleHelp size={16} />
          About Arc
          <ArrowUpRight size={13} />
        </a>
      </div>
    </aside>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workspace">{children}</main>
    </div>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <Logo />
            <p>
              A better agreement between
              <br />
              performance and payment.
            </p>
            <div className="arc-built">
              <span>Built for</span>
              <Image src="/Arc-mainnet.png" width={100} height={48} alt="Arc" />
            </div>
          </div>
          <div className="footer-links">
            <div>
              <small>EXPLORE</small>
              <Link href="/services">Services</Link>
              <Link href="/dashboard/customer">Your agreements</Link>
            </div>
            <div>
              <small>BUILD</small>
              <Link href="/provider/services/new">Become a provider</Link>
              <Link href="/dashboard/provider">Provider workspace</Link>
              <a href="https://www.arc.io/" target="_blank" rel="noreferrer">
                Arc ecosystem <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SLAForge</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
