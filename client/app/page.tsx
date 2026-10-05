"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Gauge,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Database,
  Globe2,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Eyebrow } from "@/components/ui";
import {
  JourneyCarousel,
  SettlementExperience,
} from "@/components/landing-experiences";
import { Reveal } from "@/components/motion";
import { PerformanceChart } from "@/components/charts";
import { Footer } from "@/components/navigation";
const faqs = [
  {
    q: "What is a performance-backed payment?",
    a: "Providers lock a USDC bond behind each service they list. Customers pay for a plan and their agreement starts immediately. Uptime and p95 latency are measured against the SLA throughout the service period.",
  },
  {
    q: "What happens if a provider misses the SLA?",
    a: "The customer gets a full refund of the service payment and the provider is not paid. The provider’s full service bond is slashed to the platform treasury and the service is suspended until the provider posts a new bond. The 0.1 USDC platform fee is kept either way.",
  },
  {
    q: "What services can I list?",
    a: "APIs, RPC endpoints, AI inference services, cloud tools, data feeds, and storage services with a measurable health endpoint. Providers choose uptime and maximum p95 latency guarantees for their plans.",
  },
  {
    q: "Can I try the complete flow?",
    a: "Yes. Connect the simulated wallet, select a service and plan, and create an agreement. It starts right away, so you can explore monitoring and settlement. In the provider workspace you can re-bond or delist services. Data is saved in your browser; no real USDC moves.",
  },
];
export default function Home() {
  const [faq, setFaq] = useState<number | null>(0);
  return (
    <>
      <main id="main-content" className="landing-page">
        <section className="hero" id="top">
          <div className="hero-noise" />
          <svg
            className="hero-orbits"
            viewBox="0 0 1600 950"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <circle cx="-40" cy="-80" r="490" />
            <circle cx="1680" cy="1070" r="650" />
            <path d="M0 340 310 650v300M0 810h1600" />
            <circle className="orbit-node" cx="310" cy="810" r="5" />
            <circle className="orbit-node" cx="421" cy="175" r="5" />
            <circle className="orbit-node" cx="1182" cy="651" r="5" />
            <circle className="orbit-travel" r="4" fill="white" stroke="none">
              <animateMotion
                dur="24s"
                repeatCount="indefinite"
                path="M0 810 L1600 810"
              />
            </circle>
            <circle className="orbit-travel" r="4" fill="white" stroke="none">
              <animateMotion
                dur="32s"
                repeatCount="indefinite"
                path="M275 320 C405 220 444 50 440 -50"
              />
            </circle>
          </svg>
          <div className="hero-content container">
            <Reveal>
              <div className="hero-announcement">
                <i className="live-dot" />
                <span>THE NEXT CHAPTER OF SERVICE PAYMENTS</span>
                <span className="tiny-tag">ON ARC</span>
              </div>
              <h1>
                Performance is
                <br />
                the <span className="hero-italic">promise.</span>
              </h1>
              <p className="hero-description">
                Pay for digital services based on performance.
                <br className="desktop-break" /> USDC payments. Measurable
                guarantees. A fair outcome.
              </p>
              <div className="hero-actions">
                <Link className="button button-dark button-lg" href="/services">
                  Explore services <ArrowUpRight size={18} />
                </Link>
                <Link
                  className="button button-glass button-lg"
                  href="/provider/services/new"
                >
                  Become a provider <ArrowRight size={18} />
                </Link>
              </div>
              <div className="hero-proof">
                <span>
                  <ShieldCheck size={15} />
                  Bonded services
                </span>
                <i />
                <span>
                  <Gauge size={15} />
                  Uptime + latency SLA
                </span>
                <i />
                <span>
                  <LockKeyhole size={15} />
                  USDC escrow
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.15} className="hero-console-wrap">
              <div className="hero-console">
                <div className="console-top">
                  <span>
                    <span className="console-dot" />
                    AN AGREEMENT THAT HOLDS UP
                  </span>
                  <span className="console-demo">
                    INTERACTIVE DEMO <i className="live-dot" />
                  </span>
                </div>
                <div className="console-body">
                  <div className="console-agreement">
                    <div className="console-brand">
                      <div className="service-mark blue">N</div>
                      <div>
                        <strong>Nexus API</strong>
                        <small>Production API infrastructure</small>
                      </div>
                      <span className="status status-active">
                        <i />
                        Active
                      </span>
                    </div>
                    <div className="console-money">
                      <small>PAYMENT IN ESCROW</small>
                      <strong>
                        120.00 <span>USDC</span>
                      </strong>
                      <p>
                        <ShieldCheck size={14} />
                        Backed by a 60.00 USDC service bond
                      </p>
                    </div>
                    <div className="console-timeline">
                      <span>
                        <Check size={12} />
                        Funded
                      </span>
                      <i />
                      <span>
                        <Check size={12} />
                        Bonded
                      </span>
                      <i />
                      <span className="current">
                        <Gauge size={12} />
                        Monitoring
                      </span>
                      <i />
                      <span>Settlement</span>
                    </div>
                  </div>
                  <div className="console-performance">
                    <div className="console-metrics">
                      <div>
                        <small>UPTIME</small>
                        <strong>
                          99.98<span>%</span>
                        </strong>
                        <span className="metric-ok">
                          <Check size={12} />
                          Above 99.9% SLA
                        </span>
                      </div>
                      <div>
                        <small>P95 LATENCY</small>
                        <strong>
                          124<span>ms</span>
                        </strong>
                        <span className="metric-ok">
                          <Check size={12} />
                          Below 200ms SLA
                        </span>
                      </div>
                      <div className="console-checks">
                        <small>CHECKS</small>
                        <strong>8,640</strong>
                        <span className="metric-muted">Every 30 seconds</span>
                      </div>
                    </div>
                    <PerformanceChart compact />
                    <div className="console-chart-note">
                      <span>
                        <i />
                        p95 response time · last 24 hours
                      </span>
                      <span>Simulated data</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
        <section className="category-strip">
          <div className="container">
            <span>
              BUILT FOR THE SERVICES
              <br />
              THAT POWER YOUR PRODUCT
            </span>
            <div>
              <Code2 />
              APIs
            </div>
            <div>
              <Globe2 />
              RPCs
            </div>
            <div>
              <Sparkles />
              AI services
            </div>
            <div>
              <Layers3 />
              Cloud
            </div>
            <div>
              <Database />
              Data & storage
            </div>
          </div>
        </section>
        <section className="section container" id="how-it-works">
          <Reveal>
            <div className="section-heading">
              <div>
                <Eyebrow>THE AGREEMENT, REIMAGINED</Eyebrow>
                <h2>
                  Good performance.
                  <br />
                  Fair payment.
                </h2>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <JourneyCarousel />
          </Reveal>
        </section>
        <SettlementExperience />
        <section className="arc-section">
          <div className="ruler" />
          <Reveal className="container">
            <Eyebrow>BUILT FOR THE ARC ECOSYSTEM</Eyebrow>
            <h2>
              A new foundation for
              <br />
              performance-backed payments.
            </h2>
            <p>
              USDC escrow, provider bonding, and SLA-based settlement.
              <br className="desktop-break" /> Designed for the Arc Mainnet
              ecosystem.
            </p>
            <div className="arc-card">
              <Image
                src="/Arc-mainnet.png"
                alt="Arc Mainnet"
                width={220}
                height={105}
              />
              <div>
                <span className="tiny-tag">ARC MICROGRANTS</span>
                <strong>
                  From service promise
                  <br />
                  to programmable payment.
                </strong>
                <a
                  className="text-link"
                  href="https://www.arc.io/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore Arc <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
            <small className="arc-demo-note">
              Hackathon frontend MVP · All payments and monitoring are simulated
            </small>
          </Reveal>
        </section>
        <section className="section container faq-section">
          <Reveal>
            <Eyebrow>A LITTLE MORE CLARITY</Eyebrow>
            <h2>
              Good questions.
              <br />
              Clear answers.
            </h2>
          </Reveal>
          <div className="faq-list">
            {faqs.map((item, i) => (
              <div
                className={`faq-item ${faq === i ? "open" : ""}`}
                key={item.q}
              >
                <button
                  aria-expanded={faq === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setFaq(faq === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={18} />
                </button>
                <div id={`faq-${i}`} hidden={faq !== i}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="cta-section">
          <Reveal className="container">
            <Eyebrow>LESS GUESSWORK. BETTER AGREEMENTS.</Eyebrow>
            <h2>
              Build on a promise
              <br />
              you can measure.
            </h2>
            <Link className="button button-dark button-lg" href="/services">
              Find your next service <ArrowUpRight size={18} />
            </Link>
            <a href="#how-it-works" className="cta-small-link">
              See how it works <ArrowDown size={14} />
            </a>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
