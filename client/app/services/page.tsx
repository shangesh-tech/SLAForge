"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  X,
} from "lucide-react";
import { useStore } from "@/components/store";
import { AppShell } from "@/components/navigation";
import { Select } from "@/components/select";
import { serviceConfidence } from "@/lib/confidence";
import { categories } from "@/lib/types";
import { NETWORK_NAME } from "@/lib/web3/config";
import {
  EmptyState,
  LoadingSkeleton,
  ServiceCard,
} from "@/components/ui";
export default function ServicesPage() {
  const { services: all, ready, loadError } = useStore();
  const services = all.filter((s) => s.bondStatus !== "Delisted");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All services");
  const [sort, setSort] = useState<"featured" | "confidence" | "price" | "uptime">("featured");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const filtered = services
    .filter(
      (s) =>
        (category === "All services" || s.category === category) &&
        (!onlineOnly || s.online) &&
        `${s.name} ${s.provider} ${s.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "price"
        ? (a.plans.find((p) => p.minutes === 43200)?.price ?? a.plans[0].price) -
          (b.plans.find((p) => p.minutes === 43200)?.price ?? b.plans[0].price)
        : sort === "uptime"
          ? b.uptime - a.uptime
          : sort === "confidence"
            ? serviceConfidence(b).score - serviceConfidence(a).score
            : b.customers - a.customers,
    );
  return (
    <AppShell>
      <div id="main-content">
        <div className="page-heading">
          <div>
            <h1>Find your next building block.</h1>
            <p>
              Reliable digital services. Clear guarantees. Payments backed by
              performance.
            </p>
          </div>
          <Link className="button button-outline" href="/provider/services/new">
            List a service <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="marketplace-callout">
          <ShieldCheck size={23} strokeWidth={1.4} />
          <div>
            <strong>Every promise has a stake.</strong>
            <p>
              Every service is backed by its provider’s bond, slashed if the SLA is missed.
            </p>
          </div>
          <span>USDC ON ARC</span>
        </div>
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services or providers…"
              aria-label="Search services"
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="filter-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
              />
              Available only
            </label>
            <Select
              variant="inline"
              label="Sort services"
              icon={<SlidersHorizontal size={15} />}
              value={sort}
              onChange={setSort}
              options={[
                { value: "featured", label: "Featured first", hint: "Most active customers" },
                { value: "confidence", label: "Highest confidence", hint: "Largest provider bond first" },
                { value: "price", label: "Price: low to high", hint: "Cheapest monthly plan first" },
                { value: "uptime", label: "Highest uptime SLA", hint: "Strongest guarantee first" },
              ]}
            />
          </div>
        </div>
        <div
          className="tabs category-tabs"
          role="group"
          aria-label="Filter by service category"
        >
          {["All services", ...categories].map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
              {c === "All services" && <span>{services.length}</span>}
            </button>
          ))}
        </div>
        <div className="results-meta">
          <span>
            {filtered.length} service{filtered.length !== 1 ? "s" : ""}{" "}
            available
          </span>
          <span>{loadError || `Live on ${NETWORK_NAME}`}</span>
        </div>
        {!ready ? (
          <LoadingSkeleton />
        ) : !services.length ? (
          <>
            <EmptyState
              title="No services listed yet"
              description="Be the first provider on SLAForge. List a service and post your bond on Arc."
            />
            <Link className="button button-dark" href="/provider/services/new">
              List a service <ArrowUpRight size={16} />
            </Link>
          </>
        ) : filtered.length ? (
          <div className="service-grid marketplace-grid">
            {filtered.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        ) : (
          <>
            <EmptyState />
            <button
              className="button button-outline"
              onClick={() => {
                setQuery("");
                setCategory("All services");
                setOnlineOnly(false);
              }}
            >
              Reset filters
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
