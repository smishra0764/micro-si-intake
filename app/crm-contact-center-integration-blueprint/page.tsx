import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CRM \u2194 Contact Center Integration Blueprint (RevOps Guide)",
  description:
    "A blueprint-first guide for CRM and contact center integration design decisions: matching vs deduplication, ownership, agent context placement, reliability, and security. Evaluation-only, no production connections.",
};

export default function CrmContactCenterIntegrationBlueprintPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-10">
        <header className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Blueprint Guide</p>
          <h1 className="text-3xl font-semibold">
            CRM \u2194 Contact Center Integration Blueprint
          </h1>
          <p className="text-sm text-neutral-300">
            This is an indexable, evaluation-only explainer page. It captures the decisions
            required to design a reliable CRM + contact center integration before any production
            connections are built.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span className="rounded-full border border-neutral-800 bg-neutral-950/70 px-3 py-1">
              Blueprint-first approach
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-950/70 px-3 py-1">
              No production connections
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-950/70 px-3 py-1">
              Decisions before APIs
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2">
              Matching + dedup rules
            </span>
            <span className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2">
              Ownership and context placement
            </span>
            <span className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2">
              Reliability + security posture
            </span>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What this is</h2>
          <p className="text-sm text-neutral-300">
            This app creates a structured blueprint for a CRM contact center integration. Instead
            of wiring APIs first, it documents the exact decisions that drive clean data, correct
            matching, and predictable agent experiences.
          </p>
          <p className="text-sm text-neutral-300">
            The blueprint-first approach is designed for RevOps, CX, and engineering teams to align
            on scope and constraints before implementation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Common integration problems this avoids</h2>
          <div className="space-y-3 text-sm text-neutral-300">
            <div>
              <h3 className="font-medium text-neutral-200">Duplicate activities and contacts</h3>
              <p>
                Multiple call records or contact matches happen when idempotency, matching rules,
                or external IDs are not defined.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-neutral-200">Weak matching logic</h3>
              <p>
                Phone normalization, external ID usage, and multi-field matching determine whether
                an activity attaches to the right record.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-neutral-200">Missing screen pop / context</h3>
              <p>
                Agents lose time when context is not injected into the correct workspace pane or
                when fields are incomplete.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-neutral-200">Ownership ambiguity</h3>
              <p>
                Activities can land unassigned if agent identity mapping or fixed ownership rules
                are not explicit.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-neutral-200">Reliability blind spots</h3>
              <p>
                Without volume expectations, latency targets, and idempotency keys, retries and
                partial failures create inconsistent CRM data.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-neutral-200">Logging and PII exposure</h3>
              <p>
                Data sensitivity and logging rules need to be decided up front to meet privacy and
                compliance requirements.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">What the blueprint outputs</h2>
          <div className="grid gap-4 text-sm text-neutral-300 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
              <h3 className="font-medium text-neutral-200">Systems and trigger</h3>
              <p>CRM, contact center, agent workspace, and the interaction event that starts the flow.</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
              <h3 className="font-medium text-neutral-200">Matching vs deduplication</h3>
              <p>Contact lookup strategy, phone normalization, external IDs, and duplicate prevention.</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
              <h3 className="font-medium text-neutral-200">Activity creation</h3>
              <p>Record type, subject template, and CRM associations (contact, company, deal).</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
              <h3 className="font-medium text-neutral-200">Context injection</h3>
              <p>Agent-visible fields and the exact placement (interaction tab, sidebar, etc.).</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
              <h3 className="font-medium text-neutral-200">Reliability assumptions</h3>
              <p>Expected volume, latency target, and idempotency keys to prevent retries and drift.</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
              <h3 className="font-medium text-neutral-200">Security posture</h3>
              <p>Data sensitivity classification and logging choices (masking vs no payload logging).</p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <h2 className="text-lg font-semibold">Evaluation-only disclaimer</h2>
          <p className="text-sm text-neutral-300">
            This blueprint is for planning and feedback only. It does not establish production
            connections, sync data, or store live credentials.
          </p>
        </section>

        <section className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-100 px-5 py-2 text-sm font-semibold text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition hover:opacity-90"
          >
            Start the intake
            <span aria-hidden className="text-neutral-600">
              →
            </span>
          </Link>
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
            Back to the intake overview
          </Link>
        </section>
      </div>
    </main>
  );
}
