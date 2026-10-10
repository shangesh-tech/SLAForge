"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import type { Address, Hash } from "viem";
import { Agreement, Profile, Service } from "@/lib/types";
import { WalletProvider, useWallet } from "@/lib/web3/wallet";
import { explorerTx, NETWORK_NAME } from "@/lib/web3/config";
import { friendlyError } from "@/lib/web3/errors";
import * as chain from "@/lib/web3/slaforge";
import * as api from "@/lib/profile-api";
import { WalletPicker } from "./wallet-picker";
import { Onboarding } from "./onboarding";

type Toast = {
  kind: "info" | "pending" | "success" | "error";
  message: string;
  hash?: Hash;
};
type Store = {
  services: Service[];
  agreements: Agreement[];
  wallet: Address | null;
  monitor: Address | null;
  balance: { wallet: number; claimable: number } | null;
  /** True when the last balance read failed and nothing is loaded yet. */
  balanceFailed: boolean;
  /** The connected wallet's profile (email is empty unless signed in). */
  profile: Profile;
  /** null while the connected wallet's profile is loading. */
  registered: boolean | null;
  /** Role used to tailor the UI; null when not connected or not registered. */
  role: Profile["role"] | null;
  signedIn: boolean;
  ready: boolean;
  loadError: string;
  busy: boolean;
  refresh: () => Promise<void>;
  createAgreement: (serviceId: string, planId: string) => Promise<string | null>;
  publishService: (draft: chain.ServiceDraft) => Promise<string | null>;
  rebond: (serviceId: string, amount: number) => Promise<boolean>;
  topUp: (serviceId: string, amount: number) => Promise<boolean>;
  delist: (serviceId: string) => Promise<boolean>;
  withdraw: () => Promise<boolean>;
  /** Signs in this wallet and returns its full profile (null if none or failed). */
  signIn: () => Promise<Profile | null>;
  saveProfile: (profile: Profile, message?: string) => Promise<boolean>;
  switchRole: (role: Profile["role"]) => Promise<boolean>;
  onboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  notify: (message: string) => void;
};
const Context = createContext<Store | null>(null);
const emptyProfile: Profile = {
  name: "",
  email: "",
  website: "",
  role: "Customer",
  type: "Developer",
};

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ChainStore>
        {children}
        <Onboarding />
      </ChainStore>
      <WalletPicker />
    </WalletProvider>
  );
}

function ChainStore({ children }: { children: ReactNode }) {
  const { address, walletClient, wrongNetwork, switchNetwork, openPicker } =
    useWallet();
  const [market, setMarket] = useState<{
    services: Service[];
    agreements: Agreement[];
    monitor: Address | null;
  }>({ services: [], agreements: [], monitor: null });
  const [balance, setBalance] = useState<Store["balance"]>(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // Public profiles by lowercase address (names on service cards, roles).
  const [directory, setDirectory] = useState<Record<string, api.PublicProfile>>({});
  const [mine, setMine] = useState<{ address: string; profile: Profile | null } | null>(null);
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<"auto" | "open" | "closed">("auto");
  const previous = useRef<string | null>(null);
  const me = address?.toLowerCase() ?? null;

  const lookup = useCallback(async (addresses: string[]) => {
    const wanted = [...new Set(addresses.map((a) => a.toLowerCase()))];
    if (!wanted.length) return;
    try {
      const found = await api.getPublicProfiles(wanted);
      setDirectory((d) => ({ ...d, ...found }));
    } catch {}
  }, []);

  const loadMarket = useCallback(async () => {
    try {
      const next = await chain.readMarket();
      setMarket(next);
      setLoadError("");
      lookup(next.services.map((s) => s.providerAddress));
    } catch {
      setLoadError(`Could not reach ${NETWORK_NAME}. Retrying…`);
    } finally {
      setReady(true);
    }
  }, [lookup]);

  const loadBalance = useCallback(async () => {
    if (!address) return setBalance(null);
    try {
      setBalance(await chain.readBalances(address));
      setBalanceFailed(false);
    } catch {
      setBalanceFailed(true);
    }
  }, [address]);

  // Skip a poll while the previous one is still running (slow networks).
  const refreshing = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = Promise.all([loadMarket(), loadBalance()])
      .then(() => {})
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [loadMarket, loadBalance]);

  // Initial load, then poll while the tab is visible.
  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  // A newly connected wallet loads its balance right away instead of joining a
  // refresh that started before the wallet was known.
  useEffect(() => {
    const id = setTimeout(loadBalance, 0);
    return () => clearTimeout(id);
  }, [loadBalance]);

  // When the wallet changes: end the old session, then load this wallet's profile.
  useEffect(() => {
    const before = previous.current;
    previous.current = me;
    if (before && me && before !== me) api.signOut().catch(() => {});
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        const [sessionAddress, found] = await Promise.all([
          api.getSessionAddress(),
          api.getPublicProfiles([me]),
        ]);
        if (cancelled) return;
        setSession(sessionAddress);
        setDirectory((d) => ({ ...d, ...found }));
        if (sessionAddress === me)
          setMine({ address: me, profile: await api.getMyProfile() });
      } catch {
      } finally {
        if (!cancelled) {
          setLookedUp(me);
          setOnboarding("auto");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    if (!toast || toast.kind === "pending") return;
    const id = setTimeout(() => setToast(null), toast.kind === "error" ? 7000 : 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const ownProfile = mine && mine.address === me ? mine.profile : null;
  const listed = me ? directory[me] : undefined;
  const registered = !me || lookedUp !== me ? null : !!(ownProfile || listed);
  const profile: Profile =
    ownProfile ?? (listed ? { ...emptyProfile, ...listed, email: "" } : emptyProfile);
  const signedIn = !!me && session === me;

  // Show provider names instead of short addresses where a profile exists.
  const services = useMemo(
    () =>
      market.services.map((s) => {
        const name = directory[s.providerAddress.toLowerCase()]?.name;
        return name ? { ...s, provider: name } : s;
      }),
    [market.services, directory],
  );

  /** Runs a wallet action with progress toasts, then refreshes chain data. */
  async function run<T>(
    success: string,
    action: (signer: {
      walletClient: NonNullable<typeof walletClient>;
      account: Address;
      step: chain.Step;
    }) => Promise<T & { hash: Hash }>,
  ): Promise<T | null> {
    if (!address || !walletClient) {
      openPicker();
      return null;
    }
    setBusy(true);
    try {
      if (wrongNetwork) {
        setToast({ kind: "pending", message: `Switch to ${NETWORK_NAME} in your wallet…` });
        await switchNetwork();
      }
      const result = await action({
        walletClient,
        account: address,
        step: (message, hash) => setToast({ kind: "pending", message, hash }),
      });
      setToast({ kind: "success", message: success, hash: result.hash });
      await refresh();
      return result;
    } catch (error) {
      setToast({ kind: "error", message: friendlyError(error) });
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Sign-In with Ethereum for this wallet, if not already signed in. */
  async function ensureSignedIn() {
    if (!address || !walletClient) {
      openPicker();
      throw new Error("Connect your wallet first.");
    }
    if (session === me) return;
    setToast({ kind: "pending", message: "Sign the message in your wallet. It's free." });
    await api.signIn(walletClient, address);
    setSession(me);
  }

  const value: Store = {
    services,
    agreements: market.agreements,
    monitor: market.monitor,
    wallet: address,
    balance,
    balanceFailed,
    profile,
    registered,
    role: registered ? profile.role : null,
    signedIn,
    ready,
    loadError,
    busy,
    refresh,
    notify: (message) => setToast({ kind: "info", message }),
    createAgreement: async (serviceId, planId) => {
      const service = market.services.find((v) => v.id === serviceId);
      if (registered && profile.role === "Provider") {
        setToast({ kind: "error", message: "Provider accounts can't buy services. Switch to a customer account." });
        return null;
      }
      if (me && service && service.providerAddress.toLowerCase() === me) {
        setToast({ kind: "error", message: "You can't buy your own service." });
        return null;
      }
      return (
        (
          await run("Agreement funded. Monitoring has started.", (s) =>
            chain.createAgreement(s, serviceId, Number(planId)),
          )
        )?.id ?? null
      );
    },
    publishService: async (draft) =>
      (
        await run("Bond posted. Your service is live in the marketplace.", (s) =>
          chain.listService(s, draft),
        )
      )?.id ?? null,
    rebond: async (serviceId, amount) =>
      !!(await run("Bond posted. Your service is live again.", (s) =>
        chain.rebondService(s, serviceId, amount),
      )),
    topUp: async (serviceId, amount) =>
      !!(await run("Bond increased. Your confidence badge is updated.", (s) =>
        chain.increaseBond(s, serviceId, amount),
      )),
    delist: async (serviceId) =>
      !!(await run("Service delisted. Your bond was refunded.", (s) =>
        chain.delistService(s, serviceId),
      )),
    withdraw: async () =>
      !!(await run("USDC withdrawn to your wallet.", (s) => chain.withdraw(s))),
    signIn: async () => {
      if (!me) return null;
      setBusy(true);
      try {
        await ensureSignedIn();
        const full = await api.getMyProfile();
        setMine({ address: me, profile: full });
        setToast({ kind: "success", message: "Signed in." });
        return full;
      } catch (error) {
        setToast({ kind: "error", message: friendlyError(error) });
        return null;
      } finally {
        setBusy(false);
      }
    },
    saveProfile: async (next, message = "Profile saved.") => {
      if (!me) return false;
      setBusy(true);
      try {
        await ensureSignedIn();
        setToast({ kind: "pending", message: "Saving your profile…" });
        const saved = await api.putMyProfile(next);
        setMine({ address: me, profile: saved });
        setDirectory((d) => ({
          ...d,
          [me]: {
            address: me,
            name: saved.name,
            website: saved.website,
            role: saved.role,
            type: saved.type,
          },
        }));
        setToast({ kind: "success", message });
        return true;
      } catch (error) {
        setToast({ kind: "error", message: friendlyError(error) });
        return false;
      } finally {
        setBusy(false);
      }
    },
    switchRole: async (role) => {
      if (!me) return false;
      setBusy(true);
      try {
        await ensureSignedIn();
        const current = await api.getMyProfile();
        if (!current) throw new Error("Create your profile first.");
        const saved = await api.putMyProfile({ ...current, role });
        setMine({ address: me, profile: saved });
        setDirectory((d) => ({
          ...d,
          [me]: { ...(d[me] ?? { address: me, name: saved.name, website: saved.website, type: saved.type }), role },
        }));
        setToast({ kind: "success", message: `You're now using SLAForge as a ${role.toLowerCase()}.` });
        return true;
      } catch (error) {
        setToast({ kind: "error", message: friendlyError(error) });
        return false;
      } finally {
        setBusy(false);
      }
    },
    // New wallets see onboarding once per connection until they register.
    onboardingOpen:
      onboarding === "open" || (onboarding === "auto" && registered === false),
    openOnboarding: () => setOnboarding("open"),
    closeOnboarding: () => setOnboarding("closed"),
  };
  return (
    <Context.Provider value={value}>
      {children}
      {toast && (
        <div
          className={`toast toast-${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          {toast.kind === "pending" ? (
            <LoaderCircle size={16} className="spin" aria-hidden="true" />
          ) : (
            <span className="live-dot" />
          )}
          {toast.message}
          {toast.hash && (
            <a
              className="toast-link"
              href={explorerTx(toast.hash)}
              target="_blank"
              rel="noreferrer"
            >
              View tx <ExternalLink size={12} />
            </a>
          )}
          {toast.kind !== "pending" && (
            <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
              ×
            </button>
          )}
        </div>
      )}
    </Context.Provider>
  );
}
export const useStore = () => {
  const store = useContext(Context);
  if (!store) throw new Error("Missing AppProvider");
  return store;
};
