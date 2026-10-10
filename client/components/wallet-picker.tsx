"use client";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle, Wallet } from "lucide-react";
import { NETWORK_NAME } from "@/lib/web3/config";
import { useWallet, type WalletOption } from "@/lib/web3/wallet";
import { friendlyError } from "@/lib/web3/errors";
import { ConfirmModal } from "./ui";

/** Lists every browser wallet the user has installed (EIP-6963). */
export function WalletPicker() {
  const { wallets, pickerOpen, closePicker, connect } = useWallet();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (!pickerOpen) return null;
  async function choose(wallet: WalletOption) {
    setError("");
    setPending(wallet.id);
    try {
      await connect(wallet);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPending(null);
    }
  }
  return (
    <ConfirmModal title="Connect a wallet" onClose={closePicker}>
      <p className="body-copy">
        Choose a wallet to use SLAForge on {NETWORK_NAME}. You pay and receive
        USDC, and gas is paid in USDC too.
      </p>
      {wallets.length ? (
        <div className="wallet-options">
          {wallets.map((w) => (
            <button
              key={w.id}
              className="wallet-option"
              disabled={!!pending}
              onClick={() => choose(w)}
            >
              {w.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.icon} alt="" width={28} height={28} />
              ) : (
                <span className="wallet-option-icon">
                  <Wallet size={16} />
                </span>
              )}
              <strong>{w.name}</strong>
              {pending === w.id ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <small>Detected</small>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="info-box">
          <Wallet size={17} />
          <p>
            No browser wallet found. Install a wallet extension such as{" "}
            <a
              className="text-link"
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
            >
              MetaMask <ArrowUpRight size={13} />
            </a>{" "}
            or{" "}
            <a
              className="text-link"
              href="https://rabby.io/"
              target="_blank"
              rel="noreferrer"
            >
              Rabby <ArrowUpRight size={13} />
            </a>
            , then reload this page.
          </p>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </ConfirmModal>
  );
}
