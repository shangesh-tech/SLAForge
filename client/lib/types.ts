export type Category = "API" | "RPC" | "AI" | "Cloud" | "Data" | "Storage";
export type Status = "Active" | "Passed" | "Failed";
/** Bonded: listed and bookable. Slashed: bond lost to an SLA breach, suspended
 * until re-bonded. Delisted: withdrawn by the provider, bond refunded. */
export type BondStatus = "Bonded" | "Slashed" | "Delisted";
export type Plan = { id: string; name: string; minutes: number; price: number };
export type Service = {
  id: string;
  name: string;
  provider: string;
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
  uptime: number;
  latency: number;
  checks: number;
  failedChecks: number;
  lastChecked: string | null;
};
export type Profile = {
  name: string;
  email: string;
  website: string;
  role: "Customer" | "Provider";
  type: "Developer" | "Company";
};
