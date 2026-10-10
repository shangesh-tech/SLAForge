import type { Address, WalletClient } from "viem";
import { createSiweMessage } from "viem/siwe";
import { arcChain } from "@/lib/web3/config";
import type { Profile } from "@/lib/types";

export type PublicProfile = Pick<Profile, "name" | "website" | "role" | "type"> & {
  address: string;
};

async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data as T;
}

/** The wallet signed in on this browser (lowercase), or null. */
export async function getSessionAddress() {
  const { address } = await json<{ address: string | null }>(
    await fetch("/api/auth/session", { cache: "no-store" }),
  );
  return address;
}

export async function signOut() {
  await fetch("/api/auth/session", { method: "DELETE" });
}

/** Sign-In with Ethereum: the wallet signs a message (free, no transaction). */
export async function signIn(walletClient: WalletClient, address: Address) {
  const { nonce } = await json<{ nonce: string }>(
    await fetch("/api/auth/nonce", { cache: "no-store" }),
  );
  const message = createSiweMessage({
    address,
    chainId: arcChain.id,
    domain: window.location.host,
    nonce,
    uri: window.location.origin,
    version: "1",
    statement:
      "Sign in to SLAForge to save your profile. This is free and does not send a transaction.",
  });
  const signature = await walletClient.signMessage({ account: address, message });
  await json(
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, signature }),
    }),
  );
}

export async function getMyProfile() {
  return (
    await json<{ profile: Profile | null }>(
      await fetch("/api/profile", { cache: "no-store" }),
    )
  ).profile;
}

export async function putMyProfile(profile: Profile) {
  return (
    await json<{ profile: Profile }>(
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      }),
    )
  ).profile;
}

export async function getPublicProfiles(addresses: string[]) {
  if (!addresses.length) return {};
  return (
    await json<{ profiles: Record<string, PublicProfile> }>(
      await fetch(`/api/profiles?address=${addresses.join(",")}`, {
        cache: "no-store",
      }),
    )
  ).profiles;
}
