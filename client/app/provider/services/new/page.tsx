"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Globe2,
  Info,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AppShell, WalletButton } from "@/components/navigation";
import { ConfirmModal, ServiceCard } from "@/components/ui";
import { useStore } from "@/components/store";
import { categories } from "@/data/mock";
import { Category, Service } from "@/lib/types";
import { defaultBond, minBond, usdc } from "@/lib/utils";
type DraftPlan = {
  id: string;
  name: string;
  duration: string;
  unit: "minutes" | "days";
  price: string;
};
export default function NewService() {
  const { publishService, wallet, profile } = useStore();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("API");
  const [endpoint, setEndpoint] = useState("");
  const [docs, setDocs] = useState("");
  const [uptime, setUptime] = useState("99.9");
  const [latency, setLatency] = useState("200");
  const [bond, setBond] = useState(String(defaultBond));
  const [plans, setPlans] = useState<DraftPlan[]>([
    {
      id: "demo",
      name: "5 minute demo",
      duration: "5",
      unit: "minutes",
      price: "10",
    },
    {
      id: "monthly",
      name: "1 month",
      duration: "30",
      unit: "days",
      price: "120",
    },
  ]);
  const [preview, setPreview] = useState<Service | null>(null);
  const [error, setError] = useState("");
  function updatePlan(id: string, key: keyof DraftPlan, value: string) {
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }
  function review() {
    setError("");
    if (!form.current?.reportValidity()) return;
    if (name.trim().length < 3 || description.trim().length < 30) {
      setError(
        "Use a service name of at least 3 characters and a description of at least 30 characters.",
      );
      return;
    }
    if (![endpoint, docs].every((v) => /^https?:\/\//i.test(v))) {
      setError(
        "Use an http:// or https:// URL for the endpoint and documentation.",
      );
      return;
    }
    if (plans.some((p) => !p.name.trim())) {
      setError("Every plan needs a name.");
      return;
    }
    setPreview({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      provider: profile.type === "Company" ? profile.name : "Nexus Labs",
      category,
      description: description.trim(),
      tagline: description.trim().slice(0, 90),
      uptime: Number(uptime),
      latency: Number(latency),
      endpoint,
      docs,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name.trim(),
        minutes: Number(p.duration) * (p.unit === "days" ? 1440 : 1),
        price: Number(p.price),
      })),
      color: ["blue", "purple", "peach", "green", "pink", "sand"][
        categories.indexOf(category)
      ],
      letter: name.trim().charAt(0).toUpperCase(),
      online: true,
      bond: Number(bond),
      bondStatus: "Bonded",
      customers: 0,
    });
  }
  return (
    <AppShell>
      <div id="main-content">
        <Link className="back-link" href="/dashboard/provider">
          <ArrowLeft size={15} />
          Provider workspace
        </Link>
        <div className="page-heading">
          <div>
            <h1>Put your promise out there.</h1>
            <p>
              A clear offering. A measurable SLA. Your next customer starts
              here.
            </p>
          </div>
        </div>
        <div className="detail-grid create-grid">
          <form
            className="service-form"
            ref={form}
            onSubmit={(e) => {
              e.preventDefault();
              review();
            }}
          >
            <section className="panel">
              <div className="form-section-title">
                <span>01</span>
                <div>
                  <h2>The essentials</h2>
                  <p>Tell customers what you do and who it helps.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field full-span">
                  Service name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={3}
                    maxLength={60}
                    placeholder="e.g. Nexus API"
                  />
                </label>
                <label className="field full-span">
                  Description
                  <textarea
                    aria-label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    minLength={30}
                    maxLength={1000}
                    rows={4}
                    placeholder="Describe your service, its capabilities, and why customers can rely on it…"
                  />
                  <small>
                    {description.length}/1000 characters · At least 30
                    characters
                  </small>
                </label>
                <label className="field">
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Provider
                  <input
                    value={
                      profile.type === "Company" ? profile.name : "Nexus Labs"
                    }
                    readOnly
                  />
                  <small>From your demo provider profile</small>
                </label>
              </div>
            </section>
            <section className="panel">
              <div className="form-section-title">
                <span>02</span>
                <div>
                  <h2>Endpoints & documentation</h2>
                  <p>Make your service measurable and easy to use.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field full-span">
                  Base URL / health endpoint
                  <input
                    type="url"
                    required
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.yourservice.com/health"
                  />
                  <small>
                    Use a public health endpoint. No requests are sent in this
                    demo.
                  </small>
                </label>
                <label className="field full-span">
                  Documentation URL
                  <input
                    type="url"
                    required
                    value={docs}
                    onChange={(e) => setDocs(e.target.value)}
                    placeholder="https://docs.yourservice.com"
                  />
                </label>
              </div>
            </section>
            <section className="panel">
              <div className="form-section-title">
                <span>03</span>
                <div>
                  <h2>Your service level agreement</h2>
                  <p>Set targets you can stand behind.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  Minimum uptime (%)
                  <input
                    required
                    type="number"
                    min="95"
                    max="100"
                    step="0.01"
                    value={uptime}
                    onChange={(e) => setUptime(e.target.value)}
                  />
                  <small>Percentage of successful health checks</small>
                </label>
                <label className="field">
                  Maximum p95 latency (ms)
                  <input
                    required
                    type="number"
                    min="1"
                    max="60000"
                    step="1"
                    value={latency}
                    onChange={(e) => setLatency(e.target.value)}
                  />
                  <small>95th percentile response time</small>
                </label>
                <label className="field full-span">
                  Service bond (USDC)
                  <input
                    required
                    type="number"
                    min={minBond}
                    max="1000000"
                    step="1"
                    value={bond}
                    onChange={(e) => setBond(e.target.value)}
                  />
                  <small>
                    Locked while the service is listed. Minimum {usdc(minBond)}.
                    A larger bond signals more confidence to customers.
                  </small>
                </label>
              </div>
              <div className="info-box">
                <ShieldCheck size={18} />
                <p>
                  If any agreement misses either SLA target, the full bond is
                  slashed to the platform treasury and the service is suspended
                  until you post a new bond. Delist any time to get your bond
                  back.
                </p>
              </div>
            </section>
            <section className="panel">
              <div className="form-section-title">
                <span>04</span>
                <div>
                  <h2>Plans & pricing</h2>
                  <p>Give customers a way to start and a reason to stay.</p>
                </div>
              </div>
              <div className="form-plans">
                {plans.map((p, i) => (
                  <div className="form-plan" key={p.id}>
                    <div className="form-plan-heading">
                      <strong>Plan {i + 1}</strong>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={plans.length <= 1}
                        aria-label={`Remove plan ${i + 1}`}
                        onClick={() =>
                          setPlans((ps) => ps.filter((v) => v.id !== p.id))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="form-grid">
                      <label className="field">
                        Plan name
                        <input
                          required
                          maxLength={40}
                          value={p.name}
                          onChange={(e) =>
                            updatePlan(p.id, "name", e.target.value)
                          }
                          placeholder="e.g. Monthly"
                        />
                      </label>
                      <label className="field">
                        Price (USDC)
                        <input
                          required
                          type="number"
                          min="1"
                          max="1000000"
                          step="0.01"
                          value={p.price}
                          onChange={(e) =>
                            updatePlan(p.id, "price", e.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        Duration
                        <input
                          required
                          type="number"
                          min="1"
                          max={p.unit === "days" ? 365 : 525600}
                          step="1"
                          value={p.duration}
                          onChange={(e) =>
                            updatePlan(p.id, "duration", e.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        Duration unit
                        <select
                          value={p.unit}
                          onChange={(e) =>
                            updatePlan(p.id, "unit", e.target.value)
                          }
                        >
                          <option value="minutes">Minutes</option>
                          <option value="days">Days</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="button button-outline full-width"
                disabled={plans.length >= 6}
                onClick={() =>
                  setPlans((ps) => [
                    ...ps,
                    {
                      id: `plan-${Date.now()}`,
                      name: "",
                      duration: "30",
                      unit: "days",
                      price: "",
                    },
                  ])
                }
              >
                <Plus size={16} />
                Add a plan
              </button>
            </section>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Link
                className="button button-outline"
                href="/dashboard/provider"
              >
                Cancel
              </Link>
              <button className="button button-dark" type="submit">
                <Eye size={16} />
                Preview service
              </button>
            </div>
          </form>
          <aside className="detail-aside">
            <section className="bond-education">
              <Globe2 size={28} strokeWidth={1.3} />
              <h3>A great service starts with clarity.</h3>
              <p>
                Tell your customers what they get, how it performs, and what
                happens when the promise falls short.
              </p>
              <ul className="check-list">
                <li>
                  <Check size={15} />A descriptive service name
                </li>
                <li>
                  <Check size={15} />A measurable health endpoint
                </li>
                <li>
                  <Check size={15} />
                  Realistic SLA targets
                </li>
                <li>
                  <Check size={15} />
                  Straightforward USDC pricing
                </li>
              </ul>
            </section>
            <div className="aside-note">
              <Info size={16} />
              <p>
                Publishing saves your service on this device. It becomes
                available immediately in the demo marketplace.
              </p>
            </div>
          </aside>
        </div>
        {preview && (
          <ConfirmModal
            title="Your service, ready to meet the world."
            onClose={() => setPreview(null)}
          >
            <div className="preview-card">
              <ServiceCard service={preview} preview />
            </div>
            <p className="helper">
              {preview.plans.length} plans · {preview.uptime}% uptime ·{" "}
              {preview.latency}ms maximum p95 · {usdc(preview.bond)} bond
            </p>
            <p className="body-copy">{preview.description}</p>
            {wallet ? (
              <button
                className="button button-dark full-width"
                onClick={() => {
                  publishService(preview);
                  router.push(`/services/${preview.id}`);
                }}
              >
                Post {usdc(preview.bond)} bond & publish{" "}
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <p className="helper">
                  Connect the simulated wallet to publish your service.
                </p>
                <WalletButton full />
              </>
            )}
          </ConfirmModal>
        )}
      </div>
    </AppShell>
  );
}
