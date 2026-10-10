/** Same order as the contract's Category enum. */
export const categories = ["API", "RPC", "AI", "Cloud", "Data", "Storage"] as const;
export type Category = (typeof categories)[number];
export type Status = "Active" | "Passed" | "Failed";
/** Bonded: listed and bookable. Slashed: bond lost to an SLA breach, suspended
 * until re-bonded. Delisted: withdrawn by the provider, bond refunded. */
export type BondStatus = "Bonded" | "Slashed" | "Delisted";
/** `id` is the plan's index in the service's on-chain plans array. */
export type Plan = { id: string; name: string; minutes: number; price: number };
export type Service = {
  id: string;
  name: string;
  /** Display label: the provider's profile name or short address. */
  provider: string;
  providerAddress: string;
  category: Category;
  description: string;
  tagline: string;
  uptime: number;
  latency: number;
  endpoint: string;
  docs: string;
  color: string;
  letter: string;
  plans: Plan[];
  online: boolean;
  /** Active agreements on the service. */
  customers: number;
  bond: number;
  bondStatus: BondStatus;
};
export type Agreement = {
  id: string;
  serviceId: string;
  planId: string;
  price: number;
  status: Status;
  customer: string;
  provider: string;
  created: string;
  start: string | null;
  end: string | null;
};
export type Profile = {
  name: string;
  email: string;
  website: string;
  role: "Customer" | "Provider";
  type: "Developer" | "Company";
};
