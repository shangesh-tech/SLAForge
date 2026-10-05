"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useStore } from "./store";
import { shortAddress } from "@/lib/utils";
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
  const { wallet, connect, disconnect } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="wallet-wrap">
      <button
        className={`button ${wallet ? "button-wallet" : "button-dark"} ${full ? "full-width" : ""}`}
        aria-expanded={wallet ? open : undefined}
        onClick={() => (wallet ? setOpen(!open) : connect())}
      >
        <Wallet size={16} />
        <span>{wallet ? shortAddress(wallet) : "Connect wallet"}</span>
        {wallet && <ChevronDown size={14} />}
      </button>
      {open && wallet && (
        <>
          <button
            aria-label="Close wallet menu"
            className="menu-dismiss"
            onClick={() => setOpen(false)}
          />
          <div className="wallet-menu">
            <small>SIMULATED WALLET</small>
            <strong>{shortAddress(wallet)}</strong>
            <p>2,450.00 demo USDC</p>
            <Link href="/profile" onClick={() => setOpen(false)}>
              <UserRound size={15} />
              View profile
            </Link>
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
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
  const links = [
    { href: "/services", name: "Explore services" },
    { href: "/dashboard/customer", name: "Dashboard" },
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
          <span className="network-pill">
            <i className="live-dot" />
            Arc <span>Mainnet</span>
          </span>
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
            { href: "/dashboard/provider", name: "Provider dashboard" },
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
const sidebarLinks = [
  {
    href: "/dashboard/customer",
    label: "My agreements",
    icon: LayoutDashboard,
  },
  { href: "/services", label: "Explore services", icon: FolderKanban },
  {
    href: "/dashboard/provider",
    label: "Provider workspace",
    icon: ShieldCheck,
  },
  { href: "/profile", label: "My profile", icon: UserRound },
];
export function Sidebar() {
  const pathname = usePathname();
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
        <div className="sidebar-divider" />
        <Link className="sidebar-create" href="/provider/services/new">
          <Plus size={17} />
          List a service
        </Link>
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
