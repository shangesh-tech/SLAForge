import { Agreement, Category, Service } from "@/lib/types";
export const categories: Category[] = [
  "API",
  "RPC",
  "AI",
  "Cloud",
  "Data",
  "Storage",
];
const plans = (price: number) => [
  { id: "demo", name: "5 minute demo", minutes: 5, price: 10 },
  { id: "monthly", name: "1 month", minutes: 43200, price },
  { id: "bimonthly", name: "2 months", minutes: 86400, price: price * 1.8 },
];
export const services: Service[] = [
  {
    id: "nexus-api",
    name: "Nexus API",
    provider: "Nexus Labs",
    category: "API",
    tagline: "One API. A world of possibilities.",
    description:
      "Production-ready REST APIs for authentication, payments, and business data. Built for teams that need consistent performance, predictable pricing, and a dependable foundation for their next product.",
    uptime: 99.9,
    latency: 200,
    endpoint: "https://api.nexus.example/health",
    docs: "https://docs.nexus.example",
    color: "blue",
    letter: "N",
    plans: plans(120),
    online: true,
    customers: 128,
    bond: 60,
    bondStatus: "Bonded",
  },
  {
    id: "orbit-rpc",
    name: "Orbit RPC",
    provider: "Orbit Network",
    category: "RPC",
    tagline: "Your connection to the onchain world.",
    description:
      "Low-latency RPC infrastructure for EVM applications. Access reliable node endpoints with automatic failover, indexed blockchain data, and predictable response times.",
    uptime: 99.95,
    latency: 150,
    endpoint: "https://rpc.orbit.example/health",
    docs: "https://docs.orbit.example",
    color: "purple",
    letter: "O",
    plans: plans(85),
    online: true,
    customers: 94,
    bond: 50,
    bondStatus: "Bonded",
  },
  {
    id: "neural-inference",
    name: "Neural Inference",
    provider: "Neural Labs",
    category: "AI",
    tagline: "Intelligence, without the infrastructure.",
    description:
      "Fast, scalable inference for language and embedding models. Ship intelligent experiences with a simple API and measurable guarantees for every request.",
    uptime: 99.5,
    latency: 800,
    endpoint: "https://inference.neural.example/health",
    docs: "https://docs.neural.example",
    color: "peach",
    letter: "n",
    plans: plans(200),
    online: true,
    customers: 76,
    bond: 80,
    bondStatus: "Bonded",
  },
  {
    id: "stratus-cloud",
    name: "Stratus Cloud",
    provider: "Stratus Systems",
    category: "Cloud",
    tagline: "A lighter way to run your workloads.",
    description:
      "Managed cloud functions and edge compute with global distribution. Deploy your workloads close to your users with observable performance and transparent billing.",
    uptime: 99.9,
    latency: 250,
    endpoint: "https://cloud.stratus.example/health",
    docs: "https://docs.stratus.example",
    color: "green",
    letter: "S",
    plans: plans(65),
    online: true,
    customers: 63,
    bond: 40,
    bondStatus: "Bonded",
  },
  {
    id: "prism-data",
    name: "Prism Data",
    provider: "Prism Analytics",
    category: "Data",
    tagline: "Clear signals. Better decisions.",
    description:
      "Real-time market and business intelligence data delivered through a clean, unified API. Get normalized, validated data with consistent response times.",
    uptime: 99.9,
    latency: 300,
    endpoint: "https://data.prism.example/health",
    docs: "https://docs.prism.example",
    color: "pink",
    letter: "P",
    plans: plans(95),
    online: false,
    customers: 52,
    bond: 40,
    bondStatus: "Slashed",
  },
  {
    id: "vault-storage",
    name: "Vault Storage",
    provider: "Vault Infrastructure",
    category: "Storage",
    tagline: "A dependable home for your data.",
    description:
      "Object storage for applications of every size. Securely store and retrieve files through S3-compatible endpoints with uptime backed by a performance bond.",
    uptime: 99.99,
    latency: 180,
    endpoint: "https://storage.vault.example/health",
    docs: "https://docs.vault.example",
    color: "sand",
    letter: "V",
    plans: plans(45),
    online: true,
    customers: 87,
    bond: 45,
    bondStatus: "Bonded",
  },
];
const wallet = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
export const demoWallet = wallet;
const providerWallet = "0x8Ba1f109551bD432803012645Ac136ddd64DBA72";
export function initialAgreements(): Agreement[] {
  const now = Date.now();
  // [service index, plan index, status]
  const seeds: [number, number, Agreement["status"]][] = [
    [0, 1, "Active"],
    [1, 1, "Active"],
    [3, 1, "Active"],
    [0, 1, "Passed"],
    [4, 0, "Failed"],
    [5, 1, "Passed"],
  ];
  return seeds.map(([si, pi, status], i) => {
    const service = services[si];
    const plan = service.plans[pi];
    const start =
      status === "Active"
        ? now - 86400000 * (i + 1)
        : now - 3600000 * (i + 1) - plan.minutes * 60000;
    const end = start + plan.minutes * 60000;
    const count = status === "Failed" ? 10 : 8640 + i * 480;
    const failedChecks = status === "Failed" ? 3 : 2;
    return {
      id: `SLA-${1042 + i}`,
      serviceId: service.id,
      planId: plan.id,
      price: plan.price,
      status,
      customer: wallet,
      provider: providerWallet,
      created: new Date(start - 300000).toISOString(),
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      uptime: ((count - failedChecks) / count) * 100,
      latency:
        status === "Failed"
          ? service.latency + 112
          : Math.round(service.latency * 0.62),
      checks: count,
      failedChecks,
      lastChecked: new Date(status === "Active" ? now : end).toISOString(),
    };
  });
}
export const history = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  uptime: i === 8 ? 99.82 : 99.96 + (i % 4) * 0.01,
  latency: 112 + ((i * 37) % 64),
}));
export const checks = Array.from({ length: 12 }, (_, i) => ({
  id: `CHK-${82910 - i}`,
  secondsAgo: i * 30,
  latency: 118 + ((i * 19) % 53),
  region: ["Mumbai, IN", "Frankfurt, DE", "Virginia, US"][i % 3],
  success: i !== 8,
}));
