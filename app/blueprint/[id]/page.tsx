"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";

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
  crm?: string;
  contactCenterPlatform?: string;
  contactCenter?: string;
  agentWorkspace?: string;
  agentDesktop?: string;
  ownerStrategy?: string;
  interactionIdField?: string;
  callIdField?: string;

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
  journey?: {
    perfectWorldNarrative?: string;
    initialAgentView?: string[];
    dataCapturedDuringInteraction?: string[];
    postInteractionArtifacts?: string[];
  };
  activity?: {
    creationTiming?: string;
    creationTimingNotes?: string;
    logAttempts?: string;
  };
  matching?: {
    strategy?: string[] | string;
    phoneNormalization?: string;
    normalization?: string;
    externalIdField?: string;
  };
  dedupe?: {
    scope?: string;
    allowMultipleEngagements?: boolean;
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
  exceptions?: {
    noContactMatch?: string;
    crmApiFailure?: string;
    partialData?: string;
    outOfSync?: string;
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

function toCreationTimingLabel(value?: string): string {
  switch (value) {
    case "on_interaction_accepted":
      return "When the interaction is accepted";
    case "on_interaction_completed":
      return "After the interaction ends";
    case "on_disposition_saved":
      return "After disposition is saved";
    case "when_transcript_ready":
      return "When transcript is available (post-call)";
    case "custom":
      return "Custom timing";
    default:
      return "Not specified";
  }
}

function toLogAttemptsLabel(value?: string): string {
  switch (value) {
    case "completed_only":
      return "Completed interactions only";
    case "all_attempts":
      return "All attempts";
    case "attempts_and_completed":
      return "Attempts and completed";
    default:
      return "Not specified";
  }
}

function toExceptionLabel(value?: string): string {
  switch (value) {
    case "create_unassigned_activity":
      return "Create unassigned activity";
    case "create_activity_and_flag_for_review":
      return "Create activity and flag for review";
    case "skip_and_log":
      return "Skip and log";
    case "require_agent_input":
      return "Require agent input";
    case "retry_then_dlq":
      return "Retry then DLQ";
    case "retry_then_alert":
      return "Retry then alert";
    case "create_with_defaults":
      return "Create with defaults";
    case "create_and_flag_missing_fields":
      return "Create and flag missing fields";
    case "daily_reconcile_report":
      return "Daily reconcile report";
    case "manual_queue":
      return "Manual queue";
    case "ignore":
      return "Ignore";
    default:
      return "Not specified";
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

function formatList(value?: string[]): string {
  if (!value || value.length === 0) return "Not specified";
  return value.join(", ");
}

export default function BlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showJourney, setShowJourney] = useState(false);

  const { data, missing } = useMemo(() => {
    const key = `micro_si_blueprint_${id}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { data: null, missing: true };
    }
    try {
      return { data: JSON.parse(raw) as BlueprintData, missing: false };
    } catch {
      return { data: null, missing: true };
    }
  }, [id]);

  const systems = useMemo(() => {
    const crm = pickFirst(data?.systems?.crm, data?.crm);
    const contactCenter = pickFirst(
      data?.systems?.contactCenterPlatform,
      data?.systems?.contactCenter,
      data?.contactCenterPlatform,
      data?.contactCenter
    );
    const agentWorkspace = pickFirst(
      data?.systems?.agentWorkspace,
      data?.systems?.agentDesktop,
      data?.agentWorkspace,
      data?.agentDesktop
    );

    return { crm, contactCenter, agentWorkspace };
  }, [data]);

  const ownership = useMemo(() => {
    const ownerStrategy = pickFirst(data?.ownership?.ownerStrategy, data?.ownerStrategy);
    const interactionIdField = pickFirst(
      data?.ownership?.interactionIdField,
      data?.ownership?.callIdField,
      data?.interactionIdField,
      data?.callIdField
    );

    return { ownerStrategy, interactionIdField };
  }, [data]);

  const duplicatePreventionKey = useMemo(() => {
    return pickFirst(data?.reliability?.idempotencyKey, ownership.interactionIdField);
  }, [data, ownership.interactionIdField]);

  const operationalIntent = useMemo(() => {
    const intent: string[] = [];
    const idempotencyKey = data?.reliability?.idempotencyKey;
    const latencyTarget = data?.reliability?.latencyTarget;
    const expectedVolume = data?.reliability?.expectedVolume;
    const logging = data?.security?.logging;

    if (idempotencyKey) {
      intent.push(`Uses duplicate prevention key ${idempotencyKey} to avoid double-logging the same interaction`);
    }

    if (data?.trigger?.event || latencyTarget) {
      const target = latencyTarget ? ` (target: ${latencyTarget})` : "";
      intent.push(`Agent context is intended to appear on interaction acceptance${target}`);
    }

    if (expectedVolume === "100_1000" || expectedVolume === "1000_10000" || expectedVolume === "gt_10000" || latencyTarget === "under_2s" || latencyTarget === "under_500ms") {
      intent.push("Intended for higher volume with asynchronous processing and retry-safe behavior");
    }

    if (logging === "mask_pii") {
      intent.push("PII is masked in logs");
    } else if (logging === "no_payload_logging") {
      intent.push("No payload logging");
    }

    if (ownership.ownerStrategy) {
      intent.push(toOwnerStrategyLabel(ownership.ownerStrategy));
    }

    return intent;
  }, [data, ownership.ownerStrategy]);

  const journeyNarrative = data?.journey?.perfectWorldNarrative?.trim();
  const journeyTruncated = Boolean(journeyNarrative && journeyNarrative.length > 260);
  const journeyPreview = journeyTruncated ? `${journeyNarrative?.slice(0, 260).trim()}...` : journeyNarrative;

  if (missing) {
    return (
      <main className="min-h-screen p-6 flex justify-center bg-neutral-950 text-neutral-50">
        <div className="w-full max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">Blueprint Summary</h1>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200">
              Blueprint not found in this browser. Please re-submit the intake from this device to regenerate the blueprint.
            </p>
            <Link href="/" className="mt-4 inline-flex items-center rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-100 hover:border-neutral-500">
              Return to intake
            </Link>
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
            <Link href="/" className="text-neutral-200 hover:text-white underline underline-offset-4">
              Back to intake
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Interaction journey (intent)</h2>
          <div className="space-y-2">
            <div className="text-xs uppercase text-neutral-500">Perfect world narrative</div>
            <div className="text-sm text-neutral-200 whitespace-pre-line">
              {journeyNarrative ? (showJourney || !journeyTruncated ? journeyNarrative : journeyPreview) : "Not specified"}
            </div>
            {journeyTruncated && (
              <button
                type="button"
                onClick={() => setShowJourney((prev) => !prev)}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                {showJourney ? "Show less" : "Show more"}
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-neutral-300">
            <div>
              <div className="text-xs uppercase text-neutral-500">Initial agent view</div>
              <div className="mt-1 text-neutral-200">{formatList(data?.journey?.initialAgentView)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-neutral-500">Data captured during interaction</div>
              <div className="mt-1 text-neutral-200">{formatList(data?.journey?.dataCapturedDuringInteraction)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-neutral-500">Post-interaction artifacts</div>
              <div className="mt-1 text-neutral-200">{formatList(data?.journey?.postInteractionArtifacts)}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="text-xs uppercase text-neutral-500">Operational intent</div>
          <ul className="mt-3 space-y-2 text-sm text-neutral-200">
            {operationalIntent.map((item, index) => (
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
                <div>Activity creation timing: <span className="text-neutral-200">{toCreationTimingLabel(data.activity?.creationTiming)}</span></div>
                {data.activity?.creationTiming === "custom" && data.activity?.creationTimingNotes && (
                  <div>Custom timing notes: <span className="text-neutral-200">{data.activity?.creationTimingNotes}</span></div>
                )}
                <div>What gets logged: <span className="text-neutral-200">{toLogAttemptsLabel(data.activity?.logAttempts)}</span></div>
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
                <div>Duplicate prevention: <span className="text-neutral-200">
                  {duplicatePreventionKey ? `Uses ${duplicatePreventionKey} to avoid double-logging the same interaction` : "Not specified"}
                </span></div>
                <div>Dedupe scope: <span className="text-neutral-200">
                  {data.dedupe?.scope === "same_customer_same_day"
                    ? "Same customer, same day"
                    : data.dedupe?.scope === "same_interaction_only"
                      ? "Same interaction only"
                      : "Not specified"}
                </span></div>
                {data.dedupe?.allowMultipleEngagements && (
                  <div className="text-xs text-neutral-400">
                    Multiple legitimate engagements may be created for separate lifecycle events (attempts vs completed).
                  </div>
                )}
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
          <div className="text-xs uppercase text-neutral-500">Exception handling</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm text-neutral-200">
            <div>No contact match: <span className="text-neutral-300">{toExceptionLabel(data.exceptions?.noContactMatch)}</span></div>
            <div>CRM API failure: <span className="text-neutral-300">{toExceptionLabel(data.exceptions?.crmApiFailure)}</span></div>
            <div>Partial data: <span className="text-neutral-300">{toExceptionLabel(data.exceptions?.partialData)}</span></div>
            <div>Out of sync: <span className="text-neutral-300">{toExceptionLabel(data.exceptions?.outOfSync)}</span></div>
          </div>
          <p className="mt-3 text-xs text-neutral-400">These are intended behaviors; implementation may vary.</p>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-neutral-200 group-open:mb-4">
              Full technical JSON
            </summary>
            <pre className="text-xs overflow-auto whitespace-pre-wrap text-neutral-300">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-2">
          <h2 className="text-lg font-semibold">AI-ready structured output</h2>
          <p className="text-sm text-neutral-300">
            The generated blueprint is produced as structured data so it can be reviewed by humans and consumed by AI-assisted tools or automation systems during implementation. This allows integration logic, mappings, and intended behavior to be validated or translated into implementation workflows without manual reinterpretation.
          </p>
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
