"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CircleDollarSign,
  Handshake,
  LogOut,
  Plus,
  ArrowDownLeft,
  Search,
  ShieldCheck,
  ShieldPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { ScoreIcon } from "./icons";
import { NETWORK_NAME } from "@/lib/web3/config";
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
import { maxBond, minBond, sameAddress, shortAddress, usdc } from "@/lib/utils";
import { confidenceFor, serviceConfidence } from "@/lib/confidence";
import { ConfidenceBadge, ConfidenceMeter } from "./confidence";
import { TopUpModal } from "./top-up";
import { Service, Status } from "@/lib/types";
const statuses: ("All" | Status)[] = ["All", "Active", "Passed", "Failed"];
export function CustomerDashboard() {
  const {
    agreements: all,
    services,
    wallet,
    profile,
    ready,
    balance,
    busy,
    withdraw,
  } = useStore();
  const [status, setStatus] = useState<string>("All");
  const [search, setSearch] = useState("");
  const agreements = all.filter((a) => sameAddress(a.customer, wallet));
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
      `#${a.id} ${services.find((s) => s.id === a.serviceId)?.name}`
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
              {profile.name ? `Welcome, ${profile.name.split(" ")[0]}. ` : ""}
              Track the performance behind every payment.
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
            <small>YOUR WALLET</small>
            <strong>
              {wallet ? shortAddress(wallet) : "Connect to create agreements"}
            </strong>
          </div>
          {wallet ? (
            <>
              <CopyButton value={wallet} label="Copy wallet address" />
              <span className="wallet-balance">
                <small>USDC BALANCE</small>
                <strong>{balance ? usdc(balance.wallet) : "…"}</strong>
              </span>
              {!!balance?.claimable && (
                <span className="wallet-balance">
                  <small>REFUNDS TO WITHDRAW</small>
                  <strong>{usdc(balance.claimable)}</strong>
                </span>
              )}
              {!!balance?.claimable && (
                <button
                  className="button button-dark button-sm"
                  disabled={busy}
                  onClick={() => withdraw()}
                >
                  Withdraw
                </button>
              )}
              <Link className="button button-outline button-sm" href="/payments">
                Payments <ArrowUpRight size={14} />
              </Link>
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
            icon={<ScoreIcon size={17} />}
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
            ) : !wallet ? (
              <EmptyState
                title="Connect your wallet"
                description="Your agreements are linked to your wallet. Connect it to see them."
              />
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
export function ProviderDashboard() {
  const {
    agreements,
    services,
    wallet,
    ready,
    balance,
    busy,
    rebond,
    delist,
    withdraw,
  } = useStore();
  const [action, setAction] = useState<BondAction | null>(null);
  const [topUp, setTopUp] = useState<Service | null>(null);
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState("Services");
  const owned = services.filter((s) => sameAddress(s.providerAddress, wallet));
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
  const validBond =
    Number.isFinite(bondAmount) && bondAmount >= minBond && bondAmount <= maxBond;
  function open(service: Service, type: BondAction["type"]) {
    setAmount(String(service.bond || 50));
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
            icon={<ScoreIcon size={17} />}
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
            Settlements <span>{settled.length}</span>
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
              {wallet && (
                <span className="muted-label">{shortAddress(wallet)}</span>
              )}
            </div>
            {!ready ? (
              <LoadingSkeleton />
            ) : !wallet ? (
              <>
                <EmptyState
                  title="Connect your provider wallet"
                  description="Your services and bonds are linked to the wallet that listed them."
                />
                <WalletButton />
              </>
            ) : tab === "Services" ? (
              owned.length ? (
                owned.map((s) => (
                  <div className="bond-row" key={s.id}>
                    <ServiceMark service={s} />
                    <div>
                      <Link href={`/services/${s.id}`}>
                        {s.name} <ArrowUpRight size={14} />
                      </Link>
                      <small>
                        {usdc(s.bond)} bond · {s.uptime}% uptime · ≤{" "}
                        {s.latency}ms p95 · {s.customers} active
                      </small>
                    </div>
                    <span className="bond-row-badges">
                      <ConfidenceBadge confidence={serviceConfidence(s)} />
                      <StatusBadge status={s.bondStatus} />
                    </span>
                    {s.bondStatus === "Bonded" ? (
                      <span className="bond-row-actions">
                        {s.bond < maxBond && (
                          <button
                            className="button button-dark button-sm"
                            onClick={() => setTopUp(s)}
                          >
                            <ShieldPlus size={14} />
                            Top up
                          </button>
                        )}
                        <button
                          className="button button-outline button-sm"
                          onClick={() => open(s, "delist")}
                        >
                          <LogOut size={14} />
                          Delist
                        </button>
                      </span>
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
              ) : (
                <>
                  <EmptyState
                    title="No services yet"
                    description="List your first service and post a bond to start earning."
                  />
                  <Link
                    className="button button-dark"
                    href="/provider/services/new"
                  >
                    List a service <Plus size={16} />
                  </Link>
                </>
              )
            ) : settled.length ? (
              settled.map((a) => {
                const service = services.find((s) => s.id === a.serviceId);
                return (
                  <div className="settlement-row" key={a.id}>
                    <Link href={`/agreements/${a.id}`}>
                      <strong>{service?.name}</strong>
                      <small>Agreement #{a.id}</small>
                    </Link>
                    <StatusBadge status={a.status} />
                    <div>
                      <strong>
                        {usdc(a.status === "Failed" ? 0 : a.price)}
                      </strong>
                      <small>
                        {a.status === "Failed"
                          ? "Customer refunded · bond slashed"
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
                <h2>Your earnings</h2>
                <CircleDollarSign size={18} />
              </div>
              <div className="chart-total">
                {(balance?.claimable ?? 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}{" "}
                <span>USDC</span>
              </div>
              <p className="helper">
                Payouts from met SLAs are credited to the contract. Withdraw
                them to your wallet at any time.
              </p>
              <button
                className="button button-dark full-width"
                disabled={!balance?.claimable || busy}
                onClick={() => withdraw()}
              >
                <ArrowDownLeft size={16} />
                {balance?.claimable ? "Withdraw to wallet" : "Nothing to withdraw"}
              </button>
              <Link className="text-link earnings-history-link" href="/payments">
                Payment history <ArrowUpRight size={14} />
              </Link>
            </section>
            <section className="bond-education">
              <ShieldCheck size={25} />
              <h3>Your bond backs your word.</h3>
              <p>
                Every listed service is backed by a bond you choose. Miss an SLA
                and the full bond is slashed to the platform treasury, and the
                service is suspended until you post a new bond. Delist any time
                no agreements are active to get your bond back. Top up any time, up to
                100 USDC, to raise your confidence badge.
              </p>
            </section>
          </aside>
        </div>
        {topUp && <TopUpModal service={topUp} onClose={() => setTopUp(null)} />}
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
                {action.service.customers > 0 && (
                  <p className="helper warning">
                    This service has {action.service.customers} active
                    agreement{action.service.customers === 1 ? "" : "s"}. You
                    can delist once they settle.
                  </p>
                )}
                <dl className="detail-list">
                  <div className="total-row">
                    <dt>Bond refunded to you</dt>
                    <dd>{usdc(action.service.bond)}</dd>
                  </div>
                </dl>
                <button
                  className="button button-danger full-width"
                  disabled={busy || action.service.customers > 0}
                  onClick={async () => {
                    if (await delist(action.service.id)) setAction(null);
                  }}
                >
                  <LogOut size={16} />
                  {busy ? "Waiting for your wallet…" : "Delist & refund bond"}
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
                    max={maxBond}
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <small>
                    Between {usdc(minBond)} and {usdc(maxBond)}. The full bond is
                    slashed if an SLA is missed.
                  </small>
                </label>
                <ConfidenceMeter
                  confidence={confidenceFor(Math.min(bondAmount || 0, maxBond))}
                  bond={bondAmount || 0}
                  audience="provider"
                />
                <button
                  className="button button-dark full-width"
                  disabled={!validBond || busy}
                  onClick={async () => {
                    if (await rebond(action.service.id, bondAmount))
                      setAction(null);
                  }}
                >
                  <ShieldCheck size={16} />
                  {busy
                    ? "Waiting for your wallet…"
                    : `Post ${validBond ? usdc(bondAmount) : "bond"} & relist`}
                </button>
              </>
            )}
            <p className="secure-note">
              Your wallet asks you to confirm on {NETWORK_NAME}
            </p>
          </ConfirmModal>
        )}
      </div>
    </AppShell>
  );
}
