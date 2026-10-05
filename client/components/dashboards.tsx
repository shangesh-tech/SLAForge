"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  Handshake,
  LogOut,
  Plus,
  ArrowDownLeft,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AppShell, WalletButton } from "./navigation";
import { useStore } from "./store";
import {
  AgreementCard,
  ConfirmModal,
  CopyButton,
  EmptyState,
  LoadingSkeleton,
  MetricCard,
  ServiceMark,
  StatusBadge,
} from "./ui";
import { minBond, shortAddress, usdc } from "@/lib/utils";
import { Service, Status } from "@/lib/types";
import { VolumeChart } from "./charts";
const statuses: ("All" | Status)[] = ["All", "Active", "Passed", "Failed"];
export function CustomerDashboard() {
  const { agreements, services, wallet, profile, ready } = useStore();
  const [status, setStatus] = useState<string>("All");
  const [search, setSearch] = useState("");
  const active = agreements.filter((a) => a.status === "Active");
  const committed = active.reduce((n, a) => n + a.price, 0);
  const refunds = agreements
    .filter((a) => a.status === "Failed")
    .reduce((n, a) => n + a.price, 0);
  const settled = agreements.filter((a) => a.status !== "Active");
  const kept = settled.filter((a) => a.status === "Passed").length;
  const filtered = agreements.filter(
    (a) =>
      (status === "All" || a.status === status) &&
      `${a.id} ${services.find((s) => s.id === a.serviceId)?.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <AppShell>
      <div id="main-content">
        <div className="page-heading">
          <div>
            <h1>A clear view of your agreements.</h1>
            <p>
              Welcome, {profile.name.split(" ")[0]}. Track the performance
              behind every payment.
            </p>
          </div>
          <Link className="button button-dark" href="/services">
            New agreement <Plus size={16} />
          </Link>
        </div>
        <div className="wallet-summary">
          <span className="wallet-summary-icon">
            <Wallet size={21} />
          </span>
          <div>
            <small>YOUR DEMO WALLET</small>
            <strong>
              {wallet ? shortAddress(wallet) : "Connect to create agreements"}
            </strong>
          </div>
          {wallet ? (
            <>
              <CopyButton value={wallet} label="Copy wallet address" />
              <span className="wallet-balance">
                <small>AVAILABLE DEMO BALANCE</small>
                <strong>2,450.00 USDC</strong>
              </span>
            </>
          ) : (
            <WalletButton />
          )}
        </div>
        <div className="metric-grid">
          <MetricCard
            label="Active agreements"
            value={active.length.toString().padStart(2, "0")}
            note="Currently being monitored"
            icon={<Handshake size={17} />}
          />
          <MetricCard
            label="USDC committed"
            value={usdc(committed)}
            note="Payments in active agreements"
            icon={<ShieldCheck size={17} />}
          />
          <MetricCard
            label="Refunds received"
            value={usdc(refunds)}
            note="Full refunds from missed SLAs"
            icon={<ArrowDownLeft size={17} />}
          />
          <MetricCard
            label="SLAs kept"
            value={settled.length ? `${kept}/${settled.length}` : "—"}
            note="Settled agreements that met the SLA"
            icon={<Activity size={17} />}
          />
        </div>
        <div className="dashboard-grid dashboard-grid-full">
          <section className="panel agreements-panel">
            <div className="panel-heading">
              <h2>
                Your agreements{" "}
                <span className="count-pill">{agreements.length}</span>
              </h2>
              <label className="agreements-search">
                <Search size={16} />
                <input
                  placeholder="Search by service or agreement ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search agreements"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
            </div>
            <div
              className="status-filter"
              role="group"
              aria-label="Filter agreements by status"
            >
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={s === status ? "selected" : ""}
                  aria-pressed={s === status}
                >
                  {s}
                  <span>
                    {s === "All"
                      ? agreements.length
                      : agreements.filter((a) => a.status === s).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="agreement-table-head">
              <span>SERVICE / AGREEMENT</span>
              <span>COMMITTED</span>
              <span>STATUS</span>
            </div>
            {!ready ? (
              <LoadingSkeleton />
            ) : filtered.length ? (
              filtered.map((a) => (
                <AgreementCard
                  key={a.id}
                  agreement={a}
                  service={services.find((s) => s.id === a.serviceId)}
                />
              ))
            ) : (
              <EmptyState
                title="No matching agreements"
                description="Adjust your filters or create your first service agreement."
              />
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
type BondAction = { service: Service; type: "rebond" | "delist" };
export function ProviderDashboard({
  initialProvider = "Nexus Labs",
}: {
  initialProvider?: string;
}) {
  const { agreements, services, wallet, ready, rebond, delist } = useStore();
  const [action, setAction] = useState<BondAction | null>(null);
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState("Services");
  const [provider, setProvider] = useState(initialProvider);
  const providers = [...new Set(services.map((s) => s.provider))];
  const selectedProvider = providers.includes(provider)
    ? provider
    : "Nexus Labs";
  const owned = services.filter((s) => s.provider === selectedProvider);
  const ids = new Set(owned.map((s) => s.id));
  const mine = agreements.filter((a) => ids.has(a.serviceId));
  const active = mine.filter((a) => a.status === "Active");
  const settled = mine.filter((a) => a.status !== "Active");
  const revenue = settled
    .filter((a) => a.status === "Passed")
    .reduce((n, a) => n + a.price, 0);
  const locked = owned
    .filter((s) => s.bondStatus === "Bonded")
    .reduce((n, s) => n + s.bond, 0);
  const bondAmount = Number(amount);
  const validBond = Number.isFinite(bondAmount) && bondAmount >= minBond;
  function open(service: Service, type: BondAction["type"]) {
    setAmount(String(service.bond));
    setAction({ service, type });
  }
  return (
    <AppShell>
      <div id="main-content">
        <div className="page-heading">
          <div>
            <h1>Deliver well. Earn with confidence.</h1>
            <p>Manage your services and the bonds that stand behind them.</p>
          </div>
          <Link className="button button-dark" href="/provider/services/new">
            List a service <Plus size={16} />
          </Link>
        </div>
        <div className="provider-switcher">
          <span>Explore a demo provider workspace</span>
          <label>
            Provider
            <select
              aria-label="Select provider workspace"
              value={selectedProvider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="metric-grid">
          <MetricCard
            label="Active customers"
            value={new Set(active.map((a) => a.customer)).size
              .toString()
              .padStart(2, "0")}
            note={`${active.length} active agreements`}
            icon={<Users size={17} />}
          />
          <MetricCard
            label="Settled revenue"
            value={usdc(revenue)}
            note="Service payments from met SLAs"
            icon={<CircleDollarSign size={17} />}
          />
          <MetricCard
            label="Bond locked"
            value={usdc(locked)}
            note="Across your live services"
            icon={<ShieldCheck size={17} />}
          />
          <MetricCard
            label="SLA success rate"
            value={
              settled.length
                ? `${Math.round((settled.filter((a) => a.status === "Passed").length / settled.length) * 100)}%`
                : "—"
            }
            note={
              settled.length
                ? `${settled.length} settled agreements`
                : "No completed agreements yet"
            }
            icon={<Activity size={17} />}
          />
        </div>
        <div className="tabs workspace-tabs">
          <button
            className={tab === "Services" ? "selected" : ""}
            onClick={() => setTab("Services")}
          >
            Services & bonds <span>{owned.length}</span>
          </button>
          <button
            className={tab === "Settlements" ? "selected" : ""}
            onClick={() => setTab("Settlements")}
          >
            Settlements
          </button>
        </div>
        <div className="dashboard-grid">
          <section className="panel provider-panel">
            <div className="panel-heading">
              <h2>
                {tab === "Services"
                  ? "Your services and bonds"
                  : "Recent settlements"}
              </h2>
              <span className="muted-label">{selectedProvider} demo</span>
            </div>
            {!ready ? (
              <LoadingSkeleton />
            ) : tab === "Services" ? (
              owned.map((s) => (
                <div className="bond-row" key={s.id}>
                  <ServiceMark service={s} />
                  <div>
                    <Link href={`/services/${s.id}`}>
                      {s.name} <ArrowUpRight size={14} />
                    </Link>
                    <small>
                      {usdc(s.bond)} bond · {s.uptime}% uptime · ≤ {s.latency}ms
                      p95
                    </small>
                  </div>
                  <StatusBadge status={s.bondStatus} />
                  {s.bondStatus === "Bonded" ? (
                    <button
                      className="button button-outline button-sm"
                      onClick={() => open(s, "delist")}
                    >
                      <LogOut size={14} />
                      Delist
                    </button>
                  ) : (
                    <button
                      className="button button-dark button-sm"
                      onClick={() => open(s, "rebond")}
                    >
                      <ShieldCheck size={14} />
                      {s.bondStatus === "Slashed" ? "Post bond" : "Relist"}
                    </button>
                  )}
                </div>
              ))
            ) : settled.length ? (
              settled.map((a) => {
                const service = services.find((s) => s.id === a.serviceId);
                return (
                  <div className="settlement-row" key={a.id}>
                    <Link href={`/agreements/${a.id}`}>
                      <strong>{service?.name}</strong>
                      <small>{a.id}</small>
                    </Link>
                    <StatusBadge status={a.status} />
                    <div>
                      <strong>
                        {usdc(a.status === "Failed" ? 0 : a.price)}
                      </strong>
                      <small>
                        {a.status === "Failed"
                          ? `Customer refunded · ${usdc(service?.bond ?? 0)} bond slashed`
                          : "Service payout"}
                      </small>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No settlements yet"
                description="Completed agreements will appear here with their payout details."
              />
            )}
          </section>
          <aside className="dashboard-aside">
            <section className="panel">
              <div className="panel-heading">
                <h2>Payment activity</h2>
                <span className="tiny-tag">SAMPLE</span>
              </div>
              <div className="chart-total">
                6,250 <span>USDC</span>
              </div>
              <p className="helper">Illustrative platform volume · Monthly</p>
              <VolumeChart />
            </section>
            <section className="bond-education">
              <ShieldCheck size={25} />
              <h3>Your bond backs your word.</h3>
              <p>
                Every listed service is backed by a bond you choose. Miss an SLA
                and the full bond is slashed to the platform treasury, and the
                service is suspended until you post a new bond. Delist any time
                no agreements are active to get your bond back.
              </p>
            </section>
          </aside>
        </div>
        {action && (
          <ConfirmModal
            title={
              action.type === "delist"
                ? `Delist ${action.service.name}?`
                : `Post a bond for ${action.service.name}`
            }
            onClose={() => setAction(null)}
          >
            {action.type === "delist" ? (
              <>
                <p className="body-copy">
                  The service leaves the marketplace and your bond is returned
                  to your wallet. You can relist it later by posting a new bond.
                </p>
                <dl className="detail-list">
                  <div className="total-row">
                    <dt>Bond refunded to you</dt>
                    <dd>{usdc(action.service.bond)}</dd>
                  </div>
                </dl>
                <button
                  className="button button-danger full-width"
                  onClick={() => {
                    if (delist(action.service.id)) setAction(null);
                  }}
                >
                  <LogOut size={16} />
                  Delist & refund bond
                </button>
              </>
            ) : (
              <>
                <p className="body-copy">
                  {action.service.bondStatus === "Slashed"
                    ? "Your previous bond was slashed after an SLA breach. Post a new bond to put the service back in the marketplace."
                    : "Post a bond to put this service back in the marketplace."}
                </p>
                <label className="field">
                  Bond amount (USDC)
                  <input
                    type="number"
                    min={minBond}
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <small>
                    Minimum {usdc(minBond)}. The full bond is slashed if an SLA
                    is missed.
                  </small>
                </label>
                {wallet ? (
                  <button
                    className="button button-dark full-width"
                    disabled={!validBond}
                    onClick={() => {
                      rebond(action.service.id, bondAmount);
                      setAction(null);
                    }}
                  >
                    <ShieldCheck size={16} />
                    Post {validBond ? usdc(bondAmount) : "bond"} & relist
                  </button>
                ) : (
                  <>
                    <p className="helper">
                      Connect the demo wallet to post a simulated bond.
                    </p>
                    <WalletButton full />
                  </>
                )}
              </>
            )}
            <p className="secure-note">
              Simulated funds · No onchain transaction
            </p>
          </ConfirmModal>
        )}
      </div>
    </AppShell>
  );
}
