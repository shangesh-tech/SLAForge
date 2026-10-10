"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  Hourglass,
  LoaderCircle,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Undo2,
  Wallet,
} from "lucide-react";
import type { Hash } from "viem";
import { AppShell, WalletButton } from "./navigation";
import { useStore } from "./store";
import { CopyButton, EmptyState, MetricCard, WalletAvatar } from "./ui";
import { useWallet } from "@/lib/web3/wallet";
import {
  arcChain,
  explorerAddress,
  explorerTx,
  NETWORK_NAME,
  SLAFORGE_ADDRESS,
} from "@/lib/web3/config";
import {
  readWalletTransfers,
  type HistoryCursor,
  type TransferKind,
  type WalletTransfer,
} from "@/lib/web3/history";
import { friendlyError } from "@/lib/web3/errors";
import { date, platformFee, sameAddress, shortAddress, usdc } from "@/lib/utils";
import type { Agreement, Service } from "@/lib/types";

type Settlement = { slaMet: boolean; txHash: Hash; at: string };

/** One line of the history: a USDC transfer or a credit inside the contract. */
type Row = {
  id: string;
  at: string;
  title: string;
  detail: React.ReactNode;
  /** Signed: positive is money in. null when the amount is not known. */
  amount: number | null;
  tone: "in" | "out" | "neutral" | "warn";
  group: Group;
  hash?: Hash;
  icon: React.ElementType;
};
type Group = "Payments" | "Settlements" | "Bonds" | "Withdrawals" | "Transfers";
const groups: ("All" | Group)[] = [
  "All",
  "Payments",
  "Settlements",
  "Bonds",
  "Withdrawals",
  "Transfers",
];

const transferCopy: Record<
  TransferKind,
  { title: string; group: Group; icon: React.ElementType }
> = {
  payment: { title: "Agreement payment", group: "Payments", icon: ReceiptText },
  fee: { title: "Platform fee", group: "Payments", icon: CircleDollarSign },
  bond: { title: "Service bond posted", group: "Bonds", icon: ShieldCheck },
  bondRefund: { title: "Bond returned", group: "Bonds", icon: Undo2 },
  withdrawal: { title: "Withdrawn to wallet", group: "Withdrawals", icon: ArrowDownLeft },
  received: { title: "USDC received", group: "Transfers", icon: ArrowDownLeft },
  sent: { title: "USDC sent", group: "Transfers", icon: ArrowUpRight },
};

function counterpartyLabel(t: WalletTransfer) {
  if (sameAddress(t.counterparty, SLAFORGE_ADDRESS)) return "SLAForge contract";
  if (t.kind === "fee") return "Platform treasury";
  return `${t.direction === "in" ? "From" : "To"} ${shortAddress(t.counterparty)}`;
}

function useTransfers(account: string | null, reloadKey: unknown) {
  const [data, setData] = useState<{
    account: string;
    items: WalletTransfer[];
    next: HistoryCursor;
  } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "more" | "error">("idle");

  const load = useCallback(
    async (cursor?: HistoryCursor) => {
      if (!account) return;
      setState(cursor ? "more" : "loading");
      try {
        const page = await readWalletTransfers(account as `0x${string}`, cursor);
        setData((d) => ({
          account,
          items: cursor && d?.account === account ? [...d.items, ...page.items] : page.items,
          next: page.next,
        }));
        setState("idle");
      } catch {
        setState("error");
      }
    },
    [account],
  );

  // Reloads when the wallet or its balance changes (a new transfer landed).
  useEffect(() => {
    const id = setTimeout(() => load(), 0);
    return () => clearTimeout(id);
  }, [load, reloadKey]);

  // Never show the previous wallet's history while the new one loads.
  const mine = data && data.account === account ? data : null;
  return {
    items: mine?.items ?? [],
    next: mine?.next ?? null,
    state,
    reload: () => load(),
    more: () => load(mine?.next),
  };
}

function useSettlements(ids: string[]) {
  const [found, setFound] = useState<Record<string, Settlement>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/monitor/settlements?ids=${key}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => !cancelled && setFound(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);
  return found;
}

const timeLeft = (end: string | null) => {
  if (!end) return "—";
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return "Settling";
  const m = Math.ceil(ms / 60000);
  return m < 60
    ? `${m} min left`
    : m < 2880
      ? `${Math.round(m / 60)} h left`
      : `${Math.round(m / 1440)} days left`;
};

export function PaymentsPage() {
  const {
    wallet,
    agreements,
    services,
    balance,
    balanceFailed,
    busy,
    withdraw,
    role,
    notify,
    ready,
  } = useStore();
  const { activeWallet, switchAccount } = useWallet();
  const [group, setGroup] = useState<"All" | Group>("All");
  const transfers = useTransfers(wallet, balance?.wallet);

  const serviceById = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services],
  );
  const owned = services.filter((s) => sameAddress(s.providerAddress, wallet));
  const ownedIds = new Set(owned.map((s) => s.id));
  const bought = agreements.filter((a) => sameAddress(a.customer, wallet));
  const sold = agreements.filter((a) => ownedIds.has(a.serviceId));
  // Follow what the wallet actually does: a "provider" that only bought plans
  // sees customer numbers, a "customer" that only sells sees provider numbers.
  const asProvider =
    role === "Provider"
      ? owned.length > 0 || bought.length === 0
      : owned.length > 0 && bought.length === 0;
  const sum = (list: Agreement[]) => list.reduce((n, a) => n + a.price, 0);

  const settledIds = [...bought, ...sold]
    .filter((a) => a.status === "Passed" || a.status === "Failed")
    .map((a) => a.id);
  const settlements = useSettlements([...new Set(settledIds)].sort());

  // Credits are internal to the contract (no USDC moves until a withdrawal),
  // so they come from agreement state rather than the explorer.
  const credits: Row[] = [];
  const serviceName = (a: Agreement) => serviceById.get(a.serviceId)?.name ?? `Service #${a.serviceId}`;
  const link = (a: Agreement) => (
    <Link href={`/agreements/${a.id}`}>
      {serviceName(a)} · Agreement #{a.id}
    </Link>
  );
  for (const a of bought.filter((a) => a.status === "Failed")) {
    const s = settlements[a.id];
    credits.push({
      id: `refund-${a.id}`,
      at: s?.at ?? a.end ?? a.start ?? "",
      title: "Refund credited",
      detail: <>SLA missed · {link(a)}</>,
      amount: a.price,
      tone: "in",
      group: "Settlements",
      hash: s?.txHash,
      icon: Undo2,
    });
  }
  for (const a of sold.filter((a) => a.status !== "Active")) {
    const s = settlements[a.id];
    const met = a.status === "Passed";
    credits.push({
      id: `earned-${a.id}`,
      at: s?.at ?? a.end ?? a.start ?? "",
      title: met ? "Earnings credited" : "Bond slashed",
      detail: <>{met ? "SLA met" : "SLA missed · sent to treasury"} · {link(a)}</>,
      amount: met ? a.price : null,
      tone: met ? "in" : "warn",
      group: met ? "Settlements" : "Bonds",
      hash: s?.txHash,
      icon: met ? CircleDollarSign : ShieldX,
    });
  }
  const rows: Row[] = [
    ...credits,
    ...transfers.items.map((t): Row => {
      const copy = transferCopy[t.kind];
      return {
        id: t.id,
        at: t.at,
        title: copy.title,
        detail: counterpartyLabel(t),
        amount: t.direction === "in" ? t.amount : -t.amount,
        tone: t.direction,
        group: copy.group,
        hash: t.hash,
        icon: copy.icon,
      };
    }),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const shown = rows.filter((r) => group === "All" || r.group === group);
  const count = (g: "All" | Group) =>
    g === "All" ? rows.length : rows.filter((r) => r.group === g).length;

  const pending = (asProvider ? sold : bought).filter((a) => a.status === "Active");
  const claimable = balance?.claimable ?? 0;

  if (!wallet)
    return (
      <AppShell>
        <div id="main-content">
          <PaymentsHeading />
          <section className="panel payments-connect">
            <span className="payments-connect-icon">
              <Wallet size={24} />
            </span>
            <h2>Connect your wallet</h2>
            <p>
              Your balances, pending payments and full USDC history are read
              from your wallet on {NETWORK_NAME}.
            </p>
            <WalletButton />
          </section>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div id="main-content">
        <PaymentsHeading />
        <section className="wallet-hero">
          <div className="wallet-hero-id">
            <WalletAvatar address={wallet} size={52} />
            <div>
              <small>CONNECTED WALLET</small>
              <div className="wallet-hero-address">
                <code>{wallet}</code>
                <CopyButton value={wallet} label="Copy wallet address" />
              </div>
              <div className="wallet-hero-chips">
                {activeWallet && (
                  <span className="chip">
                    {activeWallet.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeWallet.icon} alt="" width={14} height={14} />
                    ) : (
                      <Wallet size={13} />
                    )}
                    {activeWallet.name}
                  </span>
                )}
                <span className="chip">
                  <i className="live-dot" />
                  {NETWORK_NAME} · Chain {arcChain.id}
                </span>
                {role && <span className="chip chip-role">{role}</span>}
              </div>
            </div>
          </div>
          <div className="wallet-hero-balance">
            <small>AVAILABLE BALANCE</small>
            <strong>
              {balance
                ? balance.wallet.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })
                : balanceFailed
                  ? "—"
                  : "…"}
              <span>USDC</span>
            </strong>
            <p>USDC in your wallet. Network fees on Arc are paid in USDC.</p>
          </div>
          <div className="wallet-hero-actions">
            <button
              className="button button-outline button-sm"
              onClick={() => switchAccount().catch((e) => notify(friendlyError(e)))}
            >
              <ArrowLeftRight size={14} />
              Switch account
            </button>
            <a
              className="button button-outline button-sm"
              href={explorerAddress(wallet)}
              target="_blank"
              rel="noreferrer"
            >
              Explorer <ArrowUpRight size={14} />
            </a>
          </div>
        </section>

        <div className="metric-grid">
          <MetricCard
            label="Ready to withdraw"
            value={balance ? usdc(claimable) : "…"}
            note={asProvider ? "Earnings credited from met SLAs" : "Refunds credited from missed SLAs"}
            icon={<ArrowDownLeft size={17} />}
          />
          {asProvider ? (
            <>
              <MetricCard
                label="Pending earnings"
                value={usdc(sum(pending))}
                note={`${pending.length} active agreement${pending.length === 1 ? "" : "s"}`}
                icon={<Hourglass size={17} />}
              />
              <MetricCard
                label="Bonds locked"
                value={usdc(
                  owned
                    .filter((s) => s.bondStatus === "Bonded")
                    .reduce((n, s) => n + s.bond, 0),
                )}
                note="Backing your live services"
                icon={<ShieldCheck size={17} />}
              />
              <MetricCard
                label="Total earned"
                value={usdc(sum(sold.filter((a) => a.status === "Passed")))}
                note="All-time payouts from met SLAs"
                icon={<CircleDollarSign size={17} />}
              />
            </>
          ) : (
            <>
              <MetricCard
                label="In escrow"
                value={usdc(sum(pending))}
                note={`${pending.length} active agreement${pending.length === 1 ? "" : "s"}`}
                icon={<LockKeyhole size={17} />}
              />
              <MetricCard
                label="Total paid"
                value={usdc(sum(bought) + bought.length * platformFee)}
                note="Plans plus platform fees"
                icon={<ReceiptText size={17} />}
              />
              <MetricCard
                label="Refunded"
                value={usdc(sum(bought.filter((a) => a.status === "Failed")))}
                note="Full refunds from missed SLAs"
                icon={<Undo2 size={17} />}
              />
            </>
          )}
        </div>

        <div className="dashboard-grid payments-grid">
          <section className="panel history-panel">
            <div className="panel-heading">
              <h2>
                Payment history <span className="count-pill">{rows.length}</span>
              </h2>
              <button
                className="icon-button"
                aria-label="Refresh history"
                title="Refresh"
                disabled={transfers.state === "loading"}
                onClick={transfers.reload}
              >
                <RefreshCw size={15} className={transfers.state === "loading" ? "spin" : ""} />
              </button>
            </div>
            <div className="status-filter" role="group" aria-label="Filter history">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={g === group ? "selected" : ""}
                  aria-pressed={g === group}
                >
                  {g}
                  <span>{count(g)}</span>
                </button>
              ))}
            </div>
            {transfers.state === "error" && (
              <p className="history-note">
                The {NETWORK_NAME} explorer could not be reached, so wallet
                transfers are missing.{" "}
                <button className="text-link" onClick={transfers.reload}>
                  Try again
                </button>
              </p>
            )}
            {(transfers.state === "loading" || !ready) && !rows.length ? (
              <div className="history-list">
                {[0, 1, 2, 3].map((i) => (
                  <div className="history-row history-row-skeleton" key={i} />
                ))}
              </div>
            ) : shown.length ? (
              <ol className="history-list">
                {shown.map((r) => (
                  <HistoryRow row={r} key={r.id} />
                ))}
              </ol>
            ) : (
              <EmptyState
                title={group === "All" ? "No payments yet" : `No ${group.toLowerCase()} yet`}
                description="USDC payments, bonds, settlements and withdrawals for this wallet will appear here."
              />
            )}
            {transfers.next && group !== "Settlements" && (
              <button
                className="button button-outline full-width history-more"
                disabled={transfers.state === "more"}
                onClick={transfers.more}
              >
                {transfers.state === "more" ? (
                  <LoaderCircle size={15} className="spin" />
                ) : null}
                Load older activity
              </button>
            )}
          </section>

          <aside className="dashboard-aside">
            <section className="panel withdraw-panel">
              <div className="panel-heading">
                <h2>Withdraw</h2>
                <ArrowDownLeft size={18} />
              </div>
              <div className="chart-total">
                {balance
                  ? claimable.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })
                  : "…"}{" "}
                <span>USDC</span>
              </div>
              <p className="helper">
                {asProvider
                  ? "Payouts from met SLAs are credited inside the contract until you withdraw them."
                  : "Refunds from missed SLAs are credited inside the contract until you withdraw them."}
              </p>
              <button
                className="button button-dark full-width"
                disabled={!claimable || busy}
                onClick={() => withdraw()}
              >
                <ArrowDownLeft size={16} />
                {claimable ? `Withdraw ${usdc(claimable)}` : "Nothing to withdraw"}
              </button>
            </section>
            <section className="panel pending-panel">
              <div className="panel-heading">
                <h2>
                  {asProvider ? "Pending earnings" : "Held in escrow"}{" "}
                  <span className="count-pill">{pending.length}</span>
                </h2>
                <Clock3 size={18} />
              </div>
              {pending.length ? (
                <ul className="pending-list">
                  {pending.map((a) => (
                    <PendingRow key={a.id} agreement={a} service={serviceById.get(a.serviceId)} />
                  ))}
                </ul>
              ) : (
                <p className="helper">
                  {asProvider
                    ? "No active agreements on your services right now."
                    : "No payments are waiting on an active agreement."}
                </p>
              )}
              <p className="pending-foot">
                {asProvider
                  ? "Credited to you when an agreement ends with its SLA met."
                  : "Released to the provider if the SLA is met, refunded to you if it is missed."}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function PaymentsHeading() {
  return (
    <div className="page-heading">
      <div>
        <h1>Every USDC, accounted for.</h1>
        <p>Your wallet, pending balances and complete payment history in one place.</p>
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: Row }) {
  const Icon = row.icon;
  return (
    <li className={`history-row tone-${row.tone}`}>
      <span className="history-icon">
        <Icon size={16} />
      </span>
      <div className="history-main">
        <strong>{row.title}</strong>
        <small>{row.detail}</small>
      </div>
      <time className="history-time" dateTime={row.at}>
        {row.at ? date(row.at) : "—"}
      </time>
      <div className="history-amount">
        <strong>
          {row.amount === null
            ? "Full bond"
            : `${row.amount > 0 ? "+" : "−"}${usdc(Math.abs(row.amount))}`}
        </strong>
        {row.hash ? (
          <a href={explorerTx(row.hash)} target="_blank" rel="noreferrer">
            View tx <ArrowUpRight size={11} />
          </a>
        ) : (
          <small>In contract</small>
        )}
      </div>
    </li>
  );
}

function PendingRow({ agreement: a, service }: { agreement: Agreement; service?: Service }) {
  return (
    <li>
      <Link href={`/agreements/${a.id}`}>
        <span>
          <strong>{service?.name ?? `Service #${a.serviceId}`}</strong>
          <small>
            #{a.id} · {timeLeft(a.end)}
          </small>
        </span>
        <b>{usdc(a.price)}</b>
      </Link>
    </li>
  );
}
