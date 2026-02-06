"use client";

import { use, useEffect, useMemo, useState } from "react";

const FEEDBACK_URL = "https://forms.gle/FU2wvkb9K8RPVLfU6";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

type BlueprintData = {
  systems?: {
    crm?: string;
    contactCenterPlatform?: string;
    contactCenter?: string;
    agentWorkspace?: string;
    agentDesktop?: string;
  };
  trigger?: {
    event?: string;
    channel?: string;
    direction?: string;
  };
  crmActivity?: {
    objectType?: string;
    subjectTemplate?: string;
    associations?: string[];
  };
  matching?: {
    strategy?: string[] | string;
    phoneNormalization?: string;
    normalization?: string;
    externalIdField?: string;
  };
  ownership?: {
    ownerStrategy?: string;
    callIdField?: string;
    interactionIdField?: string;
  };
  reliability?: {
    expectedVolume?: string;
    idempotencyKey?: string;
    latencyTarget?: string;
  };
  security?: {
    dataSensitivity?: string;
    logging?: string;
  };
  [key: string]: unknown;
};

function toMatchingLabel(value: string): string {
  switch (value) {
    case "ani_phone_match":
      return "Match by customer phone number";
    case "external_id":
      return "Match by external customer ID";
    default:
      return value;
  }
}

function toOwnerStrategyLabel(value: string): string {
  switch (value) {
    case "map_agent_email":
      return "Assign to the agent who handled the interaction";
    case "fixed_owner":
      return "Always assign to a fixed CRM owner or queue";
    case "unassigned":
      return "Leave CRM activity unassigned";
    default:
      return value;
  }
}

function toCustomerMatchingLine(strategy?: string[] | string): string {
  if (!strategy || (Array.isArray(strategy) && strategy.length === 0)) {
    return "Not specified";
  }

  const values = Array.isArray(strategy) ? strategy : [strategy];
  const hasPhone = values.includes("ani_phone_match");
  const hasExternal = values.includes("external_id");

  if (hasPhone && hasExternal) {
    return "Phone number and external customer ID -> CRM contact";
  }
  if (hasExternal) {
    return "External customer ID -> CRM contact";
  }
  if (hasPhone) {
    return "Phone number -> CRM contact";
  }

  return values.map(toMatchingLabel).join(", ");
}

export default function BlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<BlueprintData | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const key = `micro_si_blueprint_${id}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      setMissing(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as BlueprintData;
      setData(parsed);
    } catch {
      setMissing(true);
    }
  }, [id]);

  const systems = useMemo(() => {
    const crm = pickFirst(data?.systems?.crm, (data as any)?.crm);
    const contactCenter = pickFirst(
      data?.systems?.contactCenterPlatform,
      data?.systems?.contactCenter,
      (data as any)?.contactCenterPlatform,
      (data as any)?.contactCenter
    );
    const agentWorkspace = pickFirst(
      data?.systems?.agentWorkspace,
      data?.systems?.agentDesktop,
      (data as any)?.agentWorkspace,
      (data as any)?.agentDesktop
    );

    return { crm, contactCenter, agentWorkspace };
  }, [data]);

  const ownership = useMemo(() => {
    const ownerStrategy = pickFirst(data?.ownership?.ownerStrategy, (data as any)?.ownerStrategy);
    const interactionIdField = pickFirst(
      data?.ownership?.interactionIdField,
      data?.ownership?.callIdField,
      (data as any)?.interactionIdField,
      (data as any)?.callIdField
    );

    return { ownerStrategy, interactionIdField };
  }, [data]);

  const duplicatePreventionKey = useMemo(() => {
    return pickFirst(data?.reliability?.idempotencyKey, ownership.interactionIdField);
  }, [data, ownership.interactionIdField]);

  const operationalGuarantees = useMemo(() => {
    const guarantees: string[] = [];
    const idempotencyKey = data?.reliability?.idempotencyKey;
    const latencyTarget = data?.reliability?.latencyTarget;
    const expectedVolume = data?.reliability?.expectedVolume;
    const logging = data?.security?.logging;

    if (idempotencyKey) {
      guarantees.push(`Uses duplicate prevention key ${idempotencyKey} to avoid double-logging the same interaction`);
    }

    if (data?.trigger?.event || latencyTarget) {
      const target = latencyTarget ? ` (target: ${latencyTarget})` : "";
      guarantees.push(`Agent context appears on interaction acceptance${target}`);
    }

    if (expectedVolume === "100_1000" || expectedVolume === "1000_10000" || expectedVolume === "gt_10000" || latencyTarget === "under_2s" || latencyTarget === "under_500ms") {
      guarantees.push("Built for higher volume with asynchronous processing and retry-safe behavior");
    }

    if (logging === "mask_pii") {
      guarantees.push("PII is masked in logs");
    } else if (logging === "no_payload_logging") {
      guarantees.push("No payload logging");
    }

    if (ownership.ownerStrategy) {
      guarantees.push(toOwnerStrategyLabel(ownership.ownerStrategy));
    }

    return guarantees;
  }, [data, ownership.ownerStrategy]);

  if (missing) {
    return (
      <main className="min-h-screen p-6 flex justify-center bg-neutral-950 text-neutral-50">
        <div className="w-full max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">Blueprint Summary</h1>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200">
              Blueprint not found in this browser. Please re-submit the intake from this device to regenerate the blueprint.
            </p>
            <a href="/" className="mt-4 inline-flex items-center rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-500">
              Return to intake
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen p-6 flex justify-center bg-neutral-950 text-neutral-50">
        <div className="w-full max-w-3xl">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-sm text-neutral-200">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex justify-center bg-neutral-950 text-neutral-50">
      <div className="w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Blueprint Summary</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">CRM <span className="text-neutral-400">&lt;-&gt;</span> Contact Center Blueprint</h1>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">Status: Draft (for review)</span>
          </div>
          <p className="text-sm text-neutral-400">
            This blueprint defines how your CRM and Contact Center work together when an agent accepts an interaction — including customer matching, CRM activity logging, agent context, reliability, and logging posture.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
            <span>Blueprint id: {id}</span>
            <a href="/" className="text-neutral-200 hover:text-white underline underline-offset-4">
              Back to intake
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="text-xs uppercase text-neutral-500">Operational Guarantees</div>
          <ul className="mt-3 space-y-2 text-sm text-neutral-200">
            {operationalGuarantees.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-neutral-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase text-neutral-500">Connected Systems</div>
              <div className="mt-2 space-y-2 text-sm">
                <div>CRM system: <span className="text-neutral-200">{formatValue(systems.crm)}</span></div>
                <div>Contact center platform: <span className="text-neutral-200">{formatValue(systems.contactCenter)}</span></div>
                <div>Agent workspace: <span className="text-neutral-200">{formatValue(systems.agentWorkspace)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase text-neutral-500">Trigger</div>
              <div className="mt-2 space-y-2 text-sm">
                <div>Interaction event: <span className="text-neutral-200">{formatValue(data.trigger?.event)}</span></div>
                <div>Channel (if any): <span className="text-neutral-200">{formatValue(data.trigger?.channel)}</span></div>
                <div>Direction: <span className="text-neutral-200">{formatValue(data.trigger?.direction)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase text-neutral-500">CRM Activity Logging</div>
              <div className="mt-2 space-y-2 text-sm">
                <div>Activity type: <span className="text-neutral-200">{formatValue(data.crmActivity?.objectType)}</span></div>
                <div>Activity subject: <span className="text-neutral-200">{formatValue(data.crmActivity?.subjectTemplate)}</span></div>
                <div>Links to: <span className="text-neutral-200">{formatValue(data.crmActivity?.associations)}</span></div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase text-neutral-500">Customer Matching</div>
              <div className="mt-2 space-y-2 text-sm">
                <div>Customer matching: <span className="text-neutral-200">
                  {toCustomerMatchingLine(data.matching?.strategy)}
                </span></div>
                <div>Normalization rules: <span className="text-neutral-200">{formatValue(pickFirst(data.matching?.phoneNormalization, data.matching?.normalization))}</span></div>
                <div>External customer ID field: <span className="text-neutral-200">{formatValue(data.matching?.externalIdField)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase text-neutral-500">CRM Activity Ownership</div>
              <div className="mt-2 space-y-2 text-sm">
                <div>Ownership rule: <span className="text-neutral-200">{ownership.ownerStrategy ? toOwnerStrategyLabel(ownership.ownerStrategy) : "N/A"}</span></div>
                <div>Interaction ID field: <span className="text-neutral-200">{formatValue(ownership.interactionIdField)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-xs uppercase text-neutral-500">Reliability Targets</div>
              <div className="mt-2 space-y-2 text-sm">
                <div>Estimated daily interactions: <span className="text-neutral-200">{formatValue(data.reliability?.expectedVolume)}</span></div>
                <div>Duplicate prevention: <span className="text-neutral-200">
                  {duplicatePreventionKey ? `${duplicatePreventionKey} -> intended to avoid double-logging the same interaction` : "Not specified"}
                </span></div>
                <div>Latency target: <span className="text-neutral-200">{formatValue(data.reliability?.latencyTarget)}</span></div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 md:col-span-2">
              <div className="text-xs uppercase text-neutral-500">Security & Logging</div>
              <div className="mt-2 space-y-2 text-sm">
                <div>Data sensitivity: <span className="text-neutral-200">{formatValue(data.security?.dataSensitivity)}</span></div>
                <div>Logging posture: <span className="text-neutral-200">{formatValue(data.security?.logging)}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="text-xs uppercase text-neutral-500">Share / Handoff</div>
          <p className="mt-2 text-sm text-neutral-200">
            Use this page to align RevOps, Contact Center Ops, and IT on intended behavior before implementation.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-neutral-200 group-open:mb-4">
              Full technical JSON
            </summary>
            <pre className="text-xs overflow-auto whitespace-pre-wrap text-neutral-300">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Help improve this prototype</h2>
          <p className="text-sm text-neutral-300">
            This is an evaluation-only prototype. If you work in RevOps, Sales Ops, or Contact Center operations, I’d love your honest feedback:
          </p>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li>• What looks correct?</li>
            <li>• What looks wrong or missing?</li>
            <li>• What would block adoption (security, trust, workflow)?</li>
          </ul>
          <p className="text-xs text-neutral-400">Takes ~30 seconds.</p>
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:opacity-90"
          >
            Give feedback
          </a>
        </section>
      </div>
    </main>
  );
}
