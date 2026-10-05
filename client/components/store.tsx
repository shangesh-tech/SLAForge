"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Agreement, Profile, Service } from "@/lib/types";
import {
  services as seedServices,
  initialAgreements,
  demoWallet,
} from "@/data/mock";
import { meetsSLA, usdc } from "@/lib/utils";
type State = {
  services: Service[];
  agreements: Agreement[];
  wallet: string | null;
  profile: Profile;
};
type Store = State & {
  ready: boolean;
  connect: () => void;
  disconnect: () => void;
  createAgreement: (service: Service, planId: string) => string;
  settle: (id: string, outcome: "Passed" | "Failed") => void;
  rebond: (serviceId: string, amount: number) => void;
  delist: (serviceId: string) => boolean;
  publishService: (service: Service) => void;
  saveProfile: (profile: Profile) => void;
  notify: (message: string) => void;
};
const Context = createContext<Store | null>(null);
const key = "slaforge-demo-v2";
const providerWallet = "0x8Ba1f109551bD432803012645Ac136ddd64DBA72";
const defaultState = (): State => ({
  services: seedServices,
  agreements: initialAgreements(),
  wallet: null,
  profile: {
    name: "Alex Morgan",
    email: "alex@example.com",
    website: "https://alex.example",
    role: "Customer",
    type: "Developer",
  },
});
/** A failed agreement slashes the full bond of its service and suspends it. */
function slash(services: Service[], serviceId: string) {
  return services.map((v) =>
    v.id === serviceId && v.bondStatus === "Bonded"
      ? { ...v, bondStatus: "Slashed" as const }
      : v,
  );
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(defaultState);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw);
          if (
            Array.isArray(saved.services) &&
            Array.isArray(saved.agreements) &&
            saved.profile
          )
            setState(saved);
        }
      } catch {}
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {}
  }, [state, ready]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(id);
  }, [message]);
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      setState((s) => {
        const now = Date.now();
        let changed = false;
        let services = s.services;
        const agreements = s.agreements.map((a) => {
          if (a.status !== "Active") return a;
          const service = s.services.find((v) => v.id === a.serviceId);
          if (!service) return a;
          if (a.end && now >= new Date(a.end).getTime()) {
            changed = true;
            const passed =
              a.checks > 0 &&
              meetsSLA(a.uptime, a.latency, service.uptime, service.latency);
            if (!passed) services = slash(services, a.serviceId);
            return { ...a, status: passed ? "Passed" : "Failed" } as Agreement;
          }
          if (now - new Date(a.lastChecked ?? a.start ?? now).getTime() < 30000)
            return a;
          changed = true;
          const checks = a.checks + 1;
          const failedChecks = a.failedChecks + (checks % 997 === 0 ? 1 : 0);
          return {
            ...a,
            checks,
            failedChecks,
            uptime: ((checks - failedChecks) / checks) * 100,
            latency: Math.round(service.latency * (0.52 + (checks % 8) * 0.02)),
            lastChecked: new Date(now).toISOString(),
          };
        });
        return changed ? { ...s, services, agreements } : s;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ready]);
  function settle(id: string, outcome: "Passed" | "Failed") {
    setState((s) => {
      const a = s.agreements.find((v) => v.id === id);
      const service = s.services.find((v) => v.id === a?.serviceId);
      if (!a || !service || a.status !== "Active") return s;
      const totalChecks = Math.max(a.checks, 100);
      const failed = outcome === "Failed";
      const failedChecks = failed ? Math.ceil(totalChecks * 0.016) : 0;
      const settled: Agreement = {
        ...a,
        status: outcome,
        end: new Date().toISOString(),
        checks: totalChecks,
        failedChecks,
        uptime: ((totalChecks - failedChecks) / totalChecks) * 100,
        latency: failed
          ? service.latency + 112
          : Math.round(service.latency * 0.6),
        lastChecked: new Date().toISOString(),
      };
      return {
        ...s,
        services: failed ? slash(s.services, service.id) : s.services,
        agreements: s.agreements.map((v) => (v.id === id ? settled : v)),
      };
    });
  }
  const value: Store = {
    ...state,
    ready,
    connect: () => {
      setState((s) => ({ ...s, wallet: demoWallet }));
      setMessage("Demo wallet connected. No funds are moved.");
    },
    disconnect: () => setState((s) => ({ ...s, wallet: null })),
    notify: setMessage,
    settle,
    rebond: (serviceId, amount) => {
      setState((s) => ({
        ...s,
        services: s.services.map((v) =>
          v.id === serviceId
            ? { ...v, bond: amount, bondStatus: "Bonded" as const }
            : v,
        ),
      }));
      setMessage(`Bond of ${usdc(amount)} posted. Your service is live again.`);
    },
    delist: (serviceId) => {
      const busy = state.agreements.some(
        (a) => a.serviceId === serviceId && a.status === "Active",
      );
      if (busy) {
        setMessage(
          "This service has active agreements. Delist once they settle.",
        );
        return false;
      }
      const service = state.services.find((v) => v.id === serviceId);
      setState((s) => ({
        ...s,
        services: s.services.map((v) =>
          v.id === serviceId ? { ...v, bondStatus: "Delisted" as const } : v,
        ),
      }));
      setMessage(
        service?.bondStatus === "Bonded"
          ? `Service delisted. ${usdc(service.bond)} bond refunded.`
          : "Service delisted.",
      );
      return true;
    },
    createAgreement: (service, planId) => {
      const plan = service.plans.find((p) => p.id === planId)!;
      const id = `SLA-${Date.now().toString().slice(-8)}`;
      const now = Date.now();
      const agreement: Agreement = {
        id,
        serviceId: service.id,
        planId,
        price: plan.price,
        status: "Active",
        customer: state.wallet ?? demoWallet,
        provider: providerWallet,
        created: new Date(now).toISOString(),
        start: new Date(now).toISOString(),
        end: new Date(now + plan.minutes * 60000).toISOString(),
        uptime: 100,
        latency: Math.round(service.latency * 0.6),
        checks: 0,
        failedChecks: 0,
        lastChecked: null,
      };
      setState((s) => ({ ...s, agreements: [agreement, ...s.agreements] }));
      setMessage("Agreement funded. Monitoring has started.");
      return id;
    },
    publishService: (service) => {
      setState((s) => ({ ...s, services: [service, ...s.services] }));
      setMessage(
        `Bond of ${usdc(service.bond)} posted. Your service is live in the marketplace.`,
      );
    },
    saveProfile: (profile) => {
      setState((s) => ({ ...s, profile }));
      setMessage("Profile saved on this device.");
    },
  };
  return (
    <Context.Provider value={value}>
      {children}
      {message && (
        <div className="toast" role="status">
          <span className="live-dot" />
          {message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
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
