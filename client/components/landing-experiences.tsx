"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Gauge,
  Landmark,
  LockKeyhole,
  Pause,
  Play,
  Server,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { Eyebrow } from "./ui";
import { Reveal } from "./motion";
import { usdc } from "@/lib/utils";

const steps = [
  {
    icon: ShieldCheck,
    title: "Put a promise behind it.",
    text: "Providers list a service and lock a USDC bond behind its uptime and latency guarantees.",
    detail: "PROVIDER → SERVICE BOND",
    theme: "bond",
  },
  {
    icon: Wallet,
    title: "Fund your agreement.",
    text: "Choose a bonded service, pick your plan, and pay in USDC. Your agreement starts right away.",
    detail: "CUSTOMER → PAYMENT",
    theme: "fund",
  },
  {
    icon: Gauge,
    title: "Let performance speak.",
    text: "Uptime and p95 latency are measured throughout the service period. Every check tells a story.",
    detail: "CONTINUOUS SLA CHECKS",
    theme: "monitor",
  },
  {
    icon: CheckCheck,
    title: "Settle on the outcome.",
    text: "Meet the SLA and the bond stays safe. Miss it and the full bond is slashed and the service is suspended.",
    detail: "PERFORMANCE → BOND",
    theme: "settle",
  },
];

export function JourneyCarousel() {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className={`journey-carousel ${paused ? "is-paused" : ""}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="How SLAForge works"
    >
      <div className="journey-window">
        <div className="journey-track">
          {[0, 1].map((group) => (
            <div
              className="journey-group"
              key={group}
              aria-hidden={group === 1 ? true : undefined}
              inert={group === 1 ? true : undefined}
            >
              {steps.map((step) => (
                <article
                  className={`journey-card journey-${step.theme}`}
                  key={step.title}
                >
                  <div className="journey-card-icon">
                    <step.icon size={28} strokeWidth={1.35} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <div className="journey-card-foot">
                    <span>{step.detail}</span>
                    <ArrowRight size={15} />
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="journey-carousel-footer">
        <button
          className="carousel-toggle"
          onClick={() => setPaused(!paused)}
          aria-label={
            paused ? "Play process carousel" : "Pause process carousel"
          }
          aria-pressed={paused}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          <span>{paused ? "Resume motion" : "Pause motion"}</span>
        </button>
      </div>
    </div>
  );
}

export function SettlementExperience() {
  const [passed, setPassed] = useState(true);
  const serviceBond = 40;

  return (
    <section className="settlement-section">
      <div className="container section settlement-grid">
        <Reveal className="settlement-copy">
          <Eyebrow>A FAIR OUTCOME, BUILT IN</Eyebrow>
          <h2>
            Clear terms.
            <br />
            Fair settlement.
          </h2>
          <p>
            Every service is backed by its provider&apos;s bond. Meet the uptime
            and latency SLA and the provider is paid. Miss it, and the customer
            gets a full refund while the provider&apos;s bond is slashed and the
            service is suspended until it is re-bonded.
          </p>
        </Reveal>
        <Reveal delay={0.12} className="settlement-summary">
          <div className="settlement-summary-head">
            <span className="tiny-tag">EXAMPLE SETTLEMENT</span>
            <div className="settlement-chips">
              <span>
                <Wallet size={14} aria-hidden="true" />
                10 USDC plan
              </span>
              <span>
                <ShieldCheck size={14} aria-hidden="true" />
                {serviceBond} USDC bond
              </span>
            </div>
          </div>
          <div
            className="settlement-switch"
            role="group"
            aria-label="Preview settlement outcome"
          >
            <button
              type="button"
              onClick={() => setPassed(true)}
              aria-pressed={passed}
              className={passed ? "selected" : ""}
            >
              <Check size={16} aria-hidden="true" />
              SLA met
            </button>
            <button
              type="button"
              onClick={() => setPassed(false)}
              aria-pressed={!passed}
              className={!passed ? "selected missed" : ""}
            >
              <X size={16} aria-hidden="true" />
              SLA missed
            </button>
          </div>
          <div
            className={`settlement-flows ${passed ? "is-met" : "is-missed"}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="settlement-flow" key={`pay-${passed}`}>
              <span className="flow-node">
                <LockKeyhole size={17} aria-hidden="true" />
                Payment
              </span>
              <span className="flow-line flow-good">
                <strong>{usdc(10)}</strong>
                <ArrowRight size={15} aria-hidden="true" />
              </span>
              <span className="flow-node">
                {passed ? (
                  <>
                    <Server size={17} aria-hidden="true" />
                    Provider
                  </>
                ) : (
                  <>
                    <Wallet size={17} aria-hidden="true" />
                    Customer
                  </>
                )}
              </span>
            </div>
            <div className="settlement-flow" key={String(passed)}>
              <span className="flow-node">
                <ShieldCheck size={17} aria-hidden="true" />
                Bond
              </span>
              <span
                className={`flow-line ${passed ? "flow-held" : "flow-bad"}`}
              >
                <strong>{usdc(serviceBond)}</strong>
                {passed ? (
                  <LockKeyhole size={15} aria-hidden="true" />
                ) : (
                  <ArrowRight size={15} aria-hidden="true" />
                )}
              </span>
              <span className={`flow-node ${passed ? "" : "flow-node-bad"}`}>
                {passed ? (
                  <>
                    <LockKeyhole size={17} aria-hidden="true" />
                    Stays locked
                  </>
                ) : (
                  <>
                    <Landmark size={17} aria-hidden="true" />
                    Treasury
                  </>
                )}
              </span>
            </div>
            <div
              className={`settlement-outcome ${passed ? "is-met" : "is-missed"}`}
              key={`outcome-${passed}`}
            >
              {passed ? (
                <CircleCheck size={20} aria-hidden="true" />
              ) : (
                <CircleAlert size={20} aria-hidden="true" />
              )}
              <div>
                <strong>
                  {passed
                    ? "Provider paid, service stays live"
                    : "Customer refunded in full"}
                </strong>
                <small>
                  {passed
                    ? "Both SLA targets met. The provider is paid and the bond keeps backing the service."
                    : "The provider is not paid and loses the full bond. The service is suspended until it is re-bonded."}
                </small>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
