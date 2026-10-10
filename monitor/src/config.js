import "dotenv/config";
import { defineChain, getAddress, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arc, arcTestnet } from "viem/chains";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return value;
}

const networks = {
  mainnet: { chain: arc, rpc: "https://rpc.mainnet.arc.io" },
  testnet: { chain: arcTestnet, rpc: "https://rpc.testnet.arc.io" },
};

/** "mainnet" or "testnet". If unset, a testnet RPC URL means testnet. */
export const NETWORK =
  (process.env.ARC_NETWORK ||
    (process.env.ARC_RPC_URL?.includes("testnet") ? "testnet" : "mainnet")) === "testnet"
    ? "testnet"
    : "mainnet";

export const RPC_URL = process.env.ARC_RPC_URL?.trim() || networks[NETWORK].rpc;

export const chain = defineChain({
  ...networks[NETWORK].chain,
  rpcUrls: { default: { http: [RPC_URL] } },
});

const contract = required("SLAFORGE_ADDRESS");
if (!isAddress(contract)) throw new Error("SLAFORGE_ADDRESS is not a valid address.");
export const SLAFORGE_ADDRESS = getAddress(contract);

export const MONGODB_URI = required("MONGODB_URI");
export const MONGODB_DB = process.env.MONGODB_DB?.trim() || "slaforge";

/** How often the monitor runs (one health check per watched service per run). */
export const INTERVAL_MS = Math.max(5, Number(process.env.MONITOR_INTERVAL_SECONDS) || 120) * 1000;
/** A run must not overlap the next one, even across several monitor instances. */
export const LOCK_MS = Math.max(4_000, INTERVAL_MS - 10_000);
export const AUTORUN = process.env.MONITOR_AUTORUN !== "false";

export const PORT = Number(process.env.PORT) || 4000;
export const HOST = process.env.HOST?.trim() || "0.0.0.0";
/** Protects POST /tick. Leave empty to disable manual runs. */
export const CRON_SECRET = process.env.CRON_SECRET?.trim() || "";

/** The monitor wallet. Without it the service still records checks but cannot settle. */
export const account = (() => {
  // Accept keys with or without the 0x prefix (wallets export them without it).
  const raw = process.env.MONITOR_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("MONITOR_PRIVATE_KEY is not a valid private key.");
  return privateKeyToAccount(key);
})();
