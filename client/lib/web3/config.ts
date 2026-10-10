import {
  createPublicClient,
  defineChain,
  http,
  zeroAddress,
  type Address,
} from "viem";
import { arc, arcTestnet } from "viem/chains";

const networks = {
  mainnet: {
    chain: arc,
    rpc: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
    contract: zeroAddress as Address,
  },
  testnet: {
    chain: arcTestnet,
    rpc: "https://rpc.testnet.arc.io",
    explorer: "https://explorer.testnet.arc.io",
    contract: "0x1b96d63B9c75555b44727De4Bde2D0A7B9991e95" as Address,
  },
};

/**
 * Arc network the app runs on: NEXT_PUBLIC_ARC_NETWORK ("mainnet" | "testnet").
 * When unset, a testnet RPC URL selects testnet; everything else is mainnet.
 */
export const NETWORK: keyof typeof networks =
  (process.env.NEXT_PUBLIC_ARC_NETWORK ||
    (process.env.NEXT_PUBLIC_ARC_RPC_URL?.includes("testnet")
      ? "testnet"
      : "mainnet")) === "testnet"
    ? "testnet"
    : "mainnet";
const network = networks[NETWORK];
export const IS_TESTNET = NETWORK === "testnet";

/** Public Arc RPC, shared with wallets when they add the network. */
export const PUBLIC_RPC_URL = network.rpc;
/** RPC used by the app for reads (Alchemy in .env.local, else the public RPC). */
export const RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || PUBLIC_RPC_URL;
export const EXPLORER_URL = network.explorer;
export const EXPLORER_API = `${EXPLORER_URL}/api/v2`;

export const SLAFORGE_ADDRESS = (process.env.NEXT_PUBLIC_SLAFORGE_ADDRESS ||
  network.contract) as Address;
/** Arc USDC, ERC-20 interface (6 decimals). */
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x3600000000000000000000000000000000000000") as Address;
export const USDC_DECIMALS = 6;

export const arcChain = defineChain({
  ...network.chain,
  rpcUrls: { default: { http: [PUBLIC_RPC_URL] } },
  blockExplorers: {
    default: { name: `${network.chain.name} Explorer`, url: EXPLORER_URL },
  },
});
/** "Arc" on mainnet. */
export const NETWORK_NAME = arcChain.name;

const RPC_TIMEOUT = 20_000;

/**
 * fetch with a timeout that never aborts the request. viem's own timeout
 * aborts the fetch, and some browser extensions wrap window.fetch in a way that
 * turns that abort into an "Uncaught AbortError". Here a slow request simply
 * stops being waited for, and its late result is ignored.
 */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const request = fetch(input, init);
  request.catch(() => {});
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Arc RPC request timed out.")),
      RPC_TIMEOUT,
    );
    request.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export const publicClient = createPublicClient({
  chain: arcChain,
  // timeout: 0 turns off viem's abort-based timeout; fetchWithTimeout replaces it.
  transport: http(RPC_URL, {
    timeout: 0,
    retryCount: 2,
    fetchFn: fetchWithTimeout,
  }),
});

export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerAddress = (address: string) =>
  `${EXPLORER_URL}/address/${address}`;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
