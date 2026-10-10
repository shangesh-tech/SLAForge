"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createWalletClient,
  custom,
  getAddress,
  type Address,
  type EIP1193Provider,
  type WalletClient,
} from "viem";
import { arcChain, PUBLIC_RPC_URL } from "./config";

/** A browser wallet announced through EIP-6963 (MetaMask, Rabby, Coinbase…). */
export type WalletOption = {
  id: string;
  name: string;
  icon: string;
  provider: EIP1193Provider;
};

type AnnounceEvent = CustomEvent<{
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EIP1193Provider;
}>;

type WalletState = {
  wallets: WalletOption[];
  /** The wallet app in use (MetaMask, Rabby…), null when disconnected. */
  activeWallet: Pick<WalletOption, "name" | "icon"> | null;
  address: Address | null;
  chainId: number | null;
  wrongNetwork: boolean;
  connecting: boolean;
  walletClient: WalletClient | null;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  connect: (wallet: WalletOption) => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  /** Opens the wallet's own account picker to choose another account. */
  switchAccount: () => Promise<void>;
};

const Context = createContext<WalletState | null>(null);

/** True when a wallet rejects a network switch because it does not know the chain. */
function isUnknownChain(error: unknown) {
  const codes: unknown[] = [];
  for (let e = error as { code?: unknown; cause?: unknown } | undefined; e; e = e.cause as typeof e)
    codes.push(e.code);
  return (
    codes.includes(4902) ||
    /unrecognized chain|unknown chain|4902/i.test(String((error as Error)?.message))
  );
}
const savedWalletKey = "slaforge-wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [active, setActive] = useState<WalletOption | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const restored = useRef(false);
  // Only one wallet prompt at a time: overlapping requests confuse wallets.
  const inFlight = useRef(false);

  // Discover installed wallets (EIP-6963), falling back to window.ethereum.
  useEffect(() => {
    function onAnnounce(event: Event) {
      const { info, provider } = (event as AnnounceEvent).detail;
      setWallets((list) =>
        list.some((w) => w.id === info.rdns)
          ? list
          : [
              ...list,
              { id: info.rdns, name: info.name, icon: info.icon, provider },
            ],
      );
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const fallback = setTimeout(() => {
      const injected = (window as { ethereum?: EIP1193Provider }).ethereum;
      if (injected)
        setWallets((list) =>
          list.length
            ? list
            : [
                {
                  id: "injected",
                  name: "Browser wallet",
                  icon: "",
                  provider: injected,
                },
              ],
        );
    }, 500);
    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      clearTimeout(fallback);
    };
  }, []);

  // Reconnect the last used wallet without a prompt.
  useEffect(() => {
    if (restored.current || !wallets.length) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(savedWalletKey);
    } catch {}
    const wallet = wallets.find((w) => w.id === saved);
    if (!wallet) return;
    restored.current = true;
    (async () => {
      try {
        const accounts = (await wallet.provider.request({
          method: "eth_accounts",
        })) as string[];
        if (!accounts.length) return;
        const chain = (await wallet.provider.request({
          method: "eth_chainId",
        })) as string;
        setActive(wallet);
        setAddress(getAddress(accounts[0]));
        setChainId(Number(chain));
      } catch {}
    })();
  }, [wallets]);

  const disconnect = useCallback(() => {
    setActive(null);
    setAddress(null);
    setChainId(null);
    try {
      localStorage.removeItem(savedWalletKey);
    } catch {}
  }, []);

  // Follow account and network changes made inside the wallet.
  useEffect(() => {
    if (!active) return;
    const provider = active.provider;
    const onAccounts = (accounts: string[]) =>
      accounts.length ? setAddress(getAddress(accounts[0])) : disconnect();
    const onChain = (chain: string) => setChainId(Number(chain));
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
    };
  }, [active, disconnect]);

  const connect = useCallback(async (wallet: WalletOption) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setConnecting(true);
    try {
      const accounts = (await wallet.provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const chain = (await wallet.provider.request({
        method: "eth_chainId",
      })) as string;
      setActive(wallet);
      setAddress(getAddress(accounts[0]));
      setChainId(Number(chain));
      setPickerOpen(false);
      try {
        localStorage.setItem(savedWalletKey, wallet.id);
      } catch {}
    } finally {
      inFlight.current = false;
      setConnecting(false);
    }
  }, []);

  const walletClient = useMemo(
    () =>
      active && address
        ? createWalletClient({
            account: address,
            chain: arcChain,
            transport: custom(active.provider),
          })
        : null,
    [active, address],
  );

  const switchNetwork = useCallback(async () => {
    if (!walletClient || inFlight.current) return;
    inFlight.current = true;
    try {
      await walletClient.switchChain({ id: arcChain.id });
    } catch (error) {
      // Only add the network when the wallet does not know it (EIP-3326 code
      // 4902). A rejection or any other error is passed to the caller.
      if (!isUnknownChain(error)) throw error;
      await walletClient.addChain({
        chain: {
          ...arcChain,
          rpcUrls: { default: { http: [PUBLIC_RPC_URL] } },
        },
      });
    } finally {
      inFlight.current = false;
    }
  }, [walletClient]);

  const switchAccount = useCallback(async () => {
    if (!active || inFlight.current) return;
    inFlight.current = true;
    try {
      await active.provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = (await active.provider.request({
        method: "eth_accounts",
      })) as string[];
      if (accounts.length) setAddress(getAddress(accounts[0]));
    } finally {
      inFlight.current = false;
    }
  }, [active]);

  const value: WalletState = {
    wallets,
    activeWallet: active && address ? { name: active.name, icon: active.icon } : null,
    address,
    chainId,
    wrongNetwork: !!address && chainId !== arcChain.id,
    connecting,
    walletClient,
    pickerOpen,
    openPicker: () => setPickerOpen(true),
    closePicker: () => setPickerOpen(false),
    connect,
    disconnect,
    switchNetwork,
    switchAccount,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useWallet = () => {
  const wallet = useContext(Context);
  if (!wallet) throw new Error("Missing WalletProvider");
  return wallet;
};
