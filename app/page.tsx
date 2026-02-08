"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FieldPath, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const CRM_ENUM = z.enum(["hubspot", "salesforce", "other"]);
const CONTACT_CENTER_ENUM = z.enum(["ringcentral", "five9", "genesys", "nice", "other"]);
const AGENT_WORKSPACE_ENUM = z.enum(["native_ccp_desktop", "embedded_crm_panel", "custom_workspace", "hybrid_workspace", "unknown"]);
const CRM_ACTIVITY_ENUM = z.enum(["engagement", "task", "note"]);
const OWNER_STRATEGY_ENUM = z.enum(["map_agent_email", "fixed_owner", "unassigned"]);
const PHONE_NORM_ENUM = z.enum(["us_e164", "as_is", "other"]);
const CONTEXT_PLACEMENT_ENUM = z.enum(["interaction_tab", "sidebar", "unknown"]);
const VOLUME_ENUM = z.enum(["lt_100", "100_1000", "1000_10000", "gt_10000"]);
const LATENCY_ENUM = z.enum(["best_effort", "under_2s", "under_500ms"]);
const SENSITIVITY_ENUM = z.enum(["low", "pii", "regulated"]);
const LOGGING_ENUM = z.enum(["mask_pii", "no_payload_logging"]);
const JOURNEY_INITIAL_VIEW_ENUM = z.enum([
  "Contact summary",
  "Open tickets/cases",
  "Recent activities",
  "Company/account view",
  "Knowledge base",
  "Custom view",
  "Other",
]);
const JOURNEY_DATA_CAPTURED_ENUM = z.enum([
  "Notes",
  "Disposition",
  "Reason code",
  "Customer ID",
  "Outcome",
  "Other",
]);
const JOURNEY_POST_ARTIFACTS_ENUM = z.enum([
  "Call recording",
  "Transcript",
  "Summary",
  "Disposition",
  "Follow-up task",
  "Other",
]);
type JourneyInitialView = z.infer<typeof JOURNEY_INITIAL_VIEW_ENUM>;
type JourneyDataCaptured = z.infer<typeof JOURNEY_DATA_CAPTURED_ENUM>;
type JourneyPostArtifacts = z.infer<typeof JOURNEY_POST_ARTIFACTS_ENUM>;
const ACTIVITY_CREATION_TIMING_ENUM = z.enum([
  "on_interaction_accepted",
  "on_interaction_completed",
  "on_disposition_saved",
  "when_transcript_ready",
  "custom",
]);
const ACTIVITY_LOG_ATTEMPTS_ENUM = z.enum([
  "completed_only",
  "all_attempts",
  "attempts_and_completed",
]);
const DEDUPE_SCOPE_ENUM = z.enum(["same_interaction_only", "same_customer_same_day"]);
const EXCEPTION_NO_CONTACT_MATCH_ENUM = z.enum([
  "create_unassigned_activity",
  "create_activity_and_flag_for_review",
  "skip_and_log",
  "require_agent_input",
]);
const EXCEPTION_CRM_API_FAILURE_ENUM = z.enum([
  "retry_then_dlq",
  "retry_then_alert",
  "skip_and_log",
]);
const EXCEPTION_PARTIAL_DATA_ENUM = z.enum([
  "create_with_defaults",
  "create_and_flag_missing_fields",
  "skip_and_log",
]);
const EXCEPTION_OUT_OF_SYNC_ENUM = z.enum([
  "daily_reconcile_report",
  "manual_queue",
  "ignore",
]);

const IntakeSchema = z
  .object({
    // Step 0: mode (locked to feedback_only)
    mode: z.literal("feedback_only"),

    // Step 1: systems
    crm: CRM_ENUM,
    otherCrmName: z.string().trim().optional(),
    contactCenter: CONTACT_CENTER_ENUM,
    otherContactCenterName: z.string().trim().optional(),
    agentWorkspace: AGENT_WORKSPACE_ENUM,
    //environment: z.enum(["sandbox", "demo"]).default("sandbox"),
    environment: z.enum(["sandbox", "demo"]),

    // Step 2: trigger
    direction: z.enum(["inbound", "outbound", "both"]),
    voiceOnly: z.boolean(),

    // Step 2.5: interaction journey
    journey: z.object({
      perfectWorldNarrative: z
        .string()
        .trim()
        .min(10, "Please describe the ideal interaction flow"),
      initialAgentView: z.array(JOURNEY_INITIAL_VIEW_ENUM).optional(),
      dataCapturedDuringInteraction: z.array(JOURNEY_DATA_CAPTURED_ENUM).optional(),
      postInteractionArtifacts: z.array(JOURNEY_POST_ARTIFACTS_ENUM).optional(),
    }),

    // Step 3: activity timing
    activity: z.object({
      creationTiming: ACTIVITY_CREATION_TIMING_ENUM,
      creationTimingNotes: z.string().trim().optional(),
      logAttempts: ACTIVITY_LOG_ATTEMPTS_ENUM,
    }),

    // Step 3: CRM activity
    crmActivityObjectType: CRM_ACTIVITY_ENUM,
    subjectTemplate: z
      .string()
      .min(5, "Subject template is required"),
    associations: z
      .array(z.enum(["contact", "company", "deal"]))
      .min(1, "Select at least one association"),

    // Step 4: matching
    matchingStrategy: z.array(z.enum(["ani_phone_match", "external_id"])).min(1),
    phoneNormalization: PHONE_NORM_ENUM,
    externalIdField: z.string().trim().optional(),

    // Step 4.5: dedupe decisions
    dedupe: z.object({
      scope: DEDUPE_SCOPE_ENUM,
      allowMultipleEngagements: z.boolean(),
    }),

    // Step 5: context injection
    contextFields: z.array(z.string()).min(1, "Select at least one context field"),
    customContextFields: z.string().trim().optional(), // comma-separated
    contextPlacement: CONTEXT_PLACEMENT_ENUM,

    // Step 6: ownership & audit
    ownerStrategy: OWNER_STRATEGY_ENUM,
    fixedOwner: z.string().trim().optional(),
    storeCallId: z.boolean(),
    callIdField: z.string().trim(),

    // Step 7: reliability
    expectedVolume: VOLUME_ENUM,
    idempotencyKey: z.string().trim(),
    latencyTarget: LATENCY_ENUM,

    // Step 7.5: exception handling
    exceptions: z.object({
      noContactMatch: EXCEPTION_NO_CONTACT_MATCH_ENUM,
      crmApiFailure: EXCEPTION_CRM_API_FAILURE_ENUM,
      partialData: EXCEPTION_PARTIAL_DATA_ENUM,
      outOfSync: EXCEPTION_OUT_OF_SYNC_ENUM,
    }),

    // Step 8: security
    dataSensitivity: SENSITIVITY_ENUM,
    logging: LOGGING_ENUM,
  })
  .superRefine((val, ctx) => {
    // CRM "other" requires a name
    if (val.crm === "other" && !val.otherCrmName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherCrmName"],
        message: "Please specify the CRM name",
      });
    }

    // Contact center "other" requires a name
    if (val.contactCenter === "other" && !val.otherContactCenterName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherContactCenterName"],
        message: "Please specify the contact center name",
      });
    }

    // If external_id strategy is selected, externalIdField is required
    if (val.matchingStrategy.includes("external_id") && !val.externalIdField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalIdField"],
        message: "External ID field is required when using external ID matching",
      });
    }

    // Owner fixed requires fixedOwner
    if (val.ownerStrategy === "fixed_owner" && !val.fixedOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedOwner"],
        message: "Fixed owner is required when using fixed owner strategy",
      });
    }

    // Regulated &rarr; enforce strict logging default
    if (val.dataSensitivity === "regulated" && val.logging !== "no_payload_logging") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["logging"],
        message: "For regulated data, use 'No payload logging' (recommended).",
      });
    }
  });

type IntakeForm = z.infer<typeof IntakeSchema>;

const CONTEXT_FIELD_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "contact.fullName", label: "Contact full name" },
  { id: "company.name", label: "Company/Account name" },
  { id: "contact.email", label: "Email" },
  { id: "contact.phone", label: "Phone" },
  { id: "contact.lastActivityDate", label: "Last activity date" },
  { id: "stats.openDeals", label: "Open deals count" },
  { id: "stats.openTickets", label: "Open tickets/cases count" },
];
const JOURNEY_INITIAL_VIEW_OPTIONS: Array<{ id: JourneyInitialView; label: string }> = [
  { id: "Contact summary", label: "Contact summary" },
  { id: "Open tickets/cases", label: "Open tickets/cases" },
  { id: "Recent activities", label: "Recent activities" },
  { id: "Company/account view", label: "Company/account view" },
  { id: "Knowledge base", label: "Knowledge base" },
  { id: "Custom view", label: "Custom view" },
  { id: "Other", label: "Other" },
];
const JOURNEY_DATA_CAPTURED_OPTIONS: Array<{ id: JourneyDataCaptured; label: string }> = [
  { id: "Notes", label: "Notes" },
  { id: "Disposition", label: "Disposition" },
  { id: "Reason code", label: "Reason code" },
  { id: "Customer ID", label: "Customer ID" },
  { id: "Outcome", label: "Outcome" },
  { id: "Other", label: "Other" },
];
const JOURNEY_POST_ARTIFACTS_OPTIONS: Array<{ id: JourneyPostArtifacts; label: string }> = [
  { id: "Call recording", label: "Call recording" },
  { id: "Transcript", label: "Transcript" },
  { id: "Summary", label: "Summary" },
  { id: "Disposition", label: "Disposition" },
  { id: "Follow-up task", label: "Follow-up task" },
  { id: "Other", label: "Other" },
];

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function buildNormalizedIntake(input: IntakeForm) {
  const customFields = (input.customContextFields || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const contactCenterName = input.contactCenter === "other" ? input.otherContactCenterName : input.contactCenter;
  const interactionType = input.voiceOnly ? "voice" : "generic";
  const eventType = `${contactCenterName}.interaction.accepted`;

  const normalized = {
    version: "v1",
    mode: input.mode,
    systems: {
      crm: input.crm,
      otherCrmName: input.crm === "other" ? input.otherCrmName ?? null : null,
      contactCenter: input.contactCenter,
      otherContactCenterName: input.contactCenter === "other" ? input.otherContactCenterName ?? null : null,
      agentWorkspace: input.agentWorkspace,
      environment: input.environment,
    },
    trigger: {
      event: eventType,
      interactionType,
      direction: input.direction,
    },
    journey: {
      perfectWorldNarrative: input.journey.perfectWorldNarrative,
      initialAgentView: input.journey.initialAgentView ?? [],
      dataCapturedDuringInteraction: input.journey.dataCapturedDuringInteraction ?? [],
      postInteractionArtifacts: input.journey.postInteractionArtifacts ?? [],
    },
    activity: {
      creationTiming: input.activity.creationTiming,
      creationTimingNotes: input.activity.creationTimingNotes ?? null,
      logAttempts: input.activity.logAttempts,
    },
    crmActivity: {
      objectType: input.crmActivityObjectType,
      subjectTemplate: input.subjectTemplate,
      associations: input.associations,
    },
    matching: {
      strategy: input.matchingStrategy,
      phoneNormalization: input.phoneNormalization,
      externalIdField: input.matchingStrategy.includes("external_id")
        ? input.externalIdField ?? null
        : null,
    },
    dedupe: {
      scope: input.dedupe.scope,
      allowMultipleEngagements: input.dedupe.allowMultipleEngagements,
    },
    contextInjection: {
      fields: input.contextFields,
      customFields,
      placement: input.contextPlacement,
    },
    ownership: {
      ownerStrategy: input.ownerStrategy,
      fixedOwner: input.ownerStrategy === "fixed_owner" ? input.fixedOwner ?? null : null,
      storeInteractionId: input.storeCallId,
      interactionIdField: input.storeCallId ? input.callIdField : null,
    },
    reliability: {
      expectedVolume: input.expectedVolume,
      idempotencyKey: input.idempotencyKey,
      latencyTarget: input.latencyTarget,
    },
    exceptions: {
      noContactMatch: input.exceptions.noContactMatch,
      crmApiFailure: input.exceptions.crmApiFailure,
      partialData: input.exceptions.partialData,
      outOfSync: input.exceptions.outOfSync,
    },
    security: {
      dataSensitivity: input.dataSensitivity,
      logging: input.logging,
    },
    warnings: [] as string[],
  };

  // Non-blocking warnings
  if (normalized.systems.environment !== "sandbox" && normalized.systems.environment !== "demo") {
    normalized.warnings.push("Evaluation-only: environment must be sandbox/demo.");
  }
  if (normalized.systems.agentWorkspace === "unknown") {
    normalized.warnings.push("Agent workspace not determined — context injection placement may vary by platform.");
  }
  if (normalized.security.dataSensitivity === "regulated") {
    normalized.warnings.push("Regulated data indicated — security review required before production use.");
  }

  return normalized;
}

export default function Page() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [serverMsg, setServerMsg] = useState<string>("");

  const form = useForm<IntakeForm>({
    resolver: zodResolver(IntakeSchema),
    defaultValues: {
      mode: "feedback_only",
      crm: "hubspot",
      contactCenter: "ringcentral",
      agentWorkspace: "native_ccp_desktop",
      environment: "sandbox",
      direction: "inbound",
      voiceOnly: true,
      journey: {
        perfectWorldNarrative: "",
        initialAgentView: [],
        dataCapturedDuringInteraction: [],
        postInteractionArtifacts: [],
      },
      activity: {
        creationTiming: "on_interaction_completed",
        creationTimingNotes: "",
        logAttempts: "attempts_and_completed",
      },
      crmActivityObjectType: "engagement",
      subjectTemplate: "Interaction from {{ani}} to {{dnis}}",
      associations: ["contact"],
      matchingStrategy: ["ani_phone_match"],
      phoneNormalization: "us_e164",
      contextFields: ["contact.fullName", "company.name", "contact.email", "stats.openDeals"],
      contextPlacement: "interaction_tab",
      dedupe: {
        scope: "same_interaction_only",
        allowMultipleEngagements: true,
      },
      ownerStrategy: "map_agent_email",
      storeCallId: true,
      callIdField: "interaction_id",
      expectedVolume: "100_1000",
      idempotencyKey: "interactionId",
      latencyTarget: "under_2s",
      exceptions: {
        noContactMatch: "create_activity_and_flag_for_review",
        crmApiFailure: "retry_then_dlq",
        partialData: "create_and_flag_missing_fields",
        outOfSync: "daily_reconcile_report",
      },
      dataSensitivity: "pii",
      logging: "mask_pii",
    },
    mode: "onBlur",
  });

  const values = form.watch();
  const normalized = useMemo(() => {
    // If current values are invalid, normalized may throw. Guard by parsing safely.
    const parsed = IntakeSchema.safeParse(values);
    return parsed.success ? buildNormalizedIntake(parsed.data) : null;
  }, [values]);

  const steps: Array<{ title: string; fields: FieldPath<IntakeForm>[] }> = [
    { title: "Systems", fields: ["crm", "otherCrmName", "contactCenter", "otherContactCenterName", "agentWorkspace", "environment"] as const },
    { title: "Trigger", fields: ["direction", "voiceOnly"] as const },
    { title: "Interaction Journey", fields: ["journey.perfectWorldNarrative"] as const },
    { title: "Activity Timing", fields: ["activity.creationTiming", "activity.logAttempts", "activity.creationTimingNotes"] as const },
    { title: "CRM Activity", fields: ["crmActivityObjectType", "subjectTemplate", "associations"] as const },
    { title: "Matching & Dedupe", fields: ["matchingStrategy", "phoneNormalization", "externalIdField", "dedupe.scope", "dedupe.allowMultipleEngagements"] as const },
    { title: "Context Injection", fields: ["contextFields", "customContextFields", "contextPlacement"] as const },
    { title: "Ownership & Audit", fields: ["ownerStrategy", "fixedOwner", "storeCallId", "callIdField"] as const },
    { title: "Reliability", fields: ["expectedVolume", "idempotencyKey", "latencyTarget"] as const },
    { title: "Exception Handling", fields: ["exceptions.noContactMatch", "exceptions.crmApiFailure", "exceptions.partialData", "exceptions.outOfSync"] as const },
    { title: "Security", fields: ["dataSensitivity", "logging"] as const },
    { title: "Review & Submit", fields: [] as const },
  ];

  async function next() {
    const current = steps[step];
    const ok = await form.trigger(current.fields, { shouldFocus: true });
    if (!ok) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit() {
    const parsed = IntakeSchema.safeParse(form.getValues());
    if (!parsed.success) {
      setStep(0);
      return;
    }
    const payload = buildNormalizedIntake(parsed.data);

    // Save locally for convenience (optional)
    localStorage.setItem("micro_si_intake_v1", JSON.stringify(payload, null, 2));

    setSubmitState("submitting");
    setServerMsg("");

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      const id = crypto.randomUUID();
      localStorage.setItem(`micro_si_blueprint_${id}`, JSON.stringify(payload, null, 2));
      localStorage.setItem("micro_si_last_blueprint_id", id);

      setSubmitState("done");
      setServerMsg(data?.message || "Submitted.");
      setStep(steps.length - 1);
      router.push(`/blueprint/${id}`);
    } catch (e: unknown) {
      setSubmitState("error");
      const message = e instanceof Error ? e.message : "Error submitting.";
      setServerMsg(message);
    }
  }

  return (
    <main className="min-h-screen p-6 flex justify-center bg-neutral-950 text-neutral-50">
      <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">CRM <span aria-hidden>&harr;</span> Contact Center Intake (v1)</h1>
          <p className="text-sm text-gray-600">
            Evaluation-only prototype. This intake generates a normalized JSON blueprint for the flow:
            <span className="font-medium"> Contact center interaction accepted <span aria-hidden>&rarr;</span> CRM activity + context injection</span>.
          </p>
          <p className="text-sm text-gray-600">
            This intake produces a structured integration blueprint designed for both human review and AI-assisted implementation. The output is generated as structured data so it can be validated, reviewed, or consumed by automation and AI-assisted tools during implementation.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/crm-contact-center-integration-design"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-xs font-medium text-neutral-100 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition hover:border-neutral-500 hover:bg-neutral-900"
            >
              Read the guide
              <span aria-hidden className="text-neutral-400">
                &rarr;
              </span>
            </Link>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-900">
              <span className="font-medium">Mode:</span>
              <span>feedback_only</span>
            </div>
          </div>
        </header>
        <div className="flex items-center gap-2 flex-wrap">
          {steps.map((s, idx) => (
            <span
              key={s.title}
              className={classNames(
                "text-xs px-3 py-1 rounded-full border",
                idx === step
                  ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                  : "bg-neutral-900 text-neutral-200 border-neutral-800"
              )}
            >
              {idx + 1}. {s.title}
            </span>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === steps.length - 1) void onSubmit();
            else void next();
          }}
         className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-5 space-y-6"
        >
          {/* Step content */}
          {step === 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Systems</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">CRM</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("crm")}>
                    <option value="hubspot">HubSpot</option>
                    <option value="salesforce">Salesforce (blueprint only)</option>
                    <option value="other">Other (no blueprint in v1)</option>
                  </select>
                  {form.formState.errors.crm && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.crm.message}</p>
                  )}
                </div>

                {values.crm === "other" && (
                  <div>
                    <label className="text-sm font-medium">CRM name</label>
                    <input
                      className="mt-1 w-full border rounded-lg p-2"
                      placeholder="e.g., Dynamics 365"
                      {...form.register("otherCrmName")}
                    />
                    {form.formState.errors.otherCrmName && (
                      <p className="text-xs text-red-600 mt-1">{form.formState.errors.otherCrmName.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Contact center platform</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("contactCenter")}>
                    <option value="ringcentral">RingCentral</option>
                    <option value="five9">Five9</option>
                    <option value="genesys">Genesys</option>
                    <option value="nice">NICE</option>
                    <option value="other">Other</option>
                  </select>
                  {form.formState.errors.contactCenter && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.contactCenter.message}</p>
                  )}
                </div>

                {values.contactCenter === "other" && (
                  <div>
                    <label className="text-sm font-medium">Contact center name</label>
                    <input
                      className="mt-1 w-full border rounded-lg p-2"
                      placeholder="e.g., Genesys, Avaya, Twilio"
                      {...form.register("otherContactCenterName")}
                    />
                    {form.formState.errors.otherContactCenterName && (
                      <p className="text-xs text-red-600 mt-1">{form.formState.errors.otherContactCenterName.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Agent workspace</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("agentWorkspace")}>
                    <option value="native_ccp_desktop">Native contact center desktop</option>
                    <option value="embedded_crm_panel">Embedded CRM panel</option>
                    <option value="custom_workspace">Custom agent workspace</option>
                    <option value="hybrid_workspace">Multiple / hybrid workspaces</option>
                    <option value="unknown">Not sure yet</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Environment</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("environment")}>
                    <option value="sandbox">Sandbox</option>
                    <option value="demo">Demo</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Evaluation only (sandbox/demo).</p>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Trigger</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Interaction direction</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("direction")}>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={values.voiceOnly} onChange={(e) => form.setValue("voiceOnly", e.target.checked)} />
                  <label className="text-sm font-medium">Voice-only (v1 scope)</label>
                </div>
              </div>
              <p className="text-xs text-gray-600">v1 is voice interactions only. Multi-channel support planned for future versions.</p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Interaction journey (workflow intent)</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    In a perfect world, what happens when a call/chat comes in? What does the agent see first, then next?
                  </label>
                  <textarea
                    rows={4}
                    className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800"
                    placeholder="Describe the ideal interaction flow..."
                    {...form.register("journey.perfectWorldNarrative")}
                  />
                  {form.formState.errors.journey?.perfectWorldNarrative?.message && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.journey?.perfectWorldNarrative?.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Initial agent view</label>
                  <div className="mt-2 grid md:grid-cols-2 gap-2">
                    {JOURNEY_INITIAL_VIEW_OPTIONS.map((option) => (
                      <label key={option.id} className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={values.journey?.initialAgentView?.includes(option.id)}
                          onChange={(e) => {
                            const next = new Set(values.journey?.initialAgentView || []);
                            if (e.target.checked) next.add(option.id);
                            else next.delete(option.id);
                            form.setValue("journey.initialAgentView", Array.from(next), { shouldValidate: true });
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Data captured during interaction</label>
                  <div className="mt-2 grid md:grid-cols-2 gap-2">
                    {JOURNEY_DATA_CAPTURED_OPTIONS.map((option) => (
                      <label key={option.id} className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={values.journey?.dataCapturedDuringInteraction?.includes(option.id)}
                          onChange={(e) => {
                            const next = new Set(values.journey?.dataCapturedDuringInteraction || []);
                            if (e.target.checked) next.add(option.id);
                            else next.delete(option.id);
                            form.setValue("journey.dataCapturedDuringInteraction", Array.from(next), { shouldValidate: true });
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Post-interaction artifacts</label>
                  <div className="mt-2 grid md:grid-cols-2 gap-2">
                    {JOURNEY_POST_ARTIFACTS_OPTIONS.map((option) => (
                      <label key={option.id} className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={values.journey?.postInteractionArtifacts?.includes(option.id)}
                          onChange={(e) => {
                            const next = new Set(values.journey?.postInteractionArtifacts || []);
                            if (e.target.checked) next.add(option.id);
                            else next.delete(option.id);
                            form.setValue("journey.postInteractionArtifacts", Array.from(next), { shouldValidate: true });
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">When should the CRM log the engagement/activity?</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Activity creation timing</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("activity.creationTiming")}>
                    <option value="on_interaction_accepted">On interaction accepted</option>
                    <option value="on_interaction_completed">After interaction completed</option>
                    <option value="on_disposition_saved">After disposition saved</option>
                    <option value="when_transcript_ready">When transcript is ready</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">What gets logged</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("activity.logAttempts")}>
                    <option value="completed_only">Completed interactions only</option>
                    <option value="all_attempts">All attempts</option>
                    <option value="attempts_and_completed">Attempts and completed</option>
                  </select>
                </div>
              </div>

              {values.activity?.creationTiming === "custom" && (
                <div>
                  <label className="text-sm font-medium">Custom timing notes (optional)</label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800"
                    placeholder="Describe the timing rule..."
                    {...form.register("activity.creationTimingNotes")}
                  />
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">CRM Activity</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">CRM activity record type</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("crmActivityObjectType")}>
                    <option value="engagement">Engagement (recommended)</option>
                    <option value="task">Task</option>
                    <option value="note">Note</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Subject template</label>
                  <input className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("subjectTemplate")} />
                  {form.formState.errors.subjectTemplate && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.subjectTemplate.message}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    Tokens supported in v1: <code>{"{{ani}}"}</code>, <code>{"{{dnis}}"}</code>, <code>{"{{interactionId}}"}</code>
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Associate activity to</label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {(["contact", "company", "deal"] as const).map((a) => (
                      <label key={a} className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={a}
                          checked={values.associations?.includes(a)}
                          onChange={(e) => {
                            const next = new Set(values.associations || []);
                            if (e.target.checked) next.add(a);
                            else next.delete(a);
                            const nextValues = Array.from(next) as IntakeForm["associations"];
                            form.setValue("associations", nextValues, { shouldValidate: true });
                          }}
                        />
                        {a === "contact" ? "Contact" : a === "company" ? "Company/Account" : "Deal/Opportunity"}
                      </label>
                    ))}
                  </div>
                  {form.formState.errors.associations?.message && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.associations.message}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Matching & Dedupe</h2>

              <div className="space-y-3">
                <label className="text-sm font-medium">Customer matching (how should we identify the CRM contact?)</label>

                <div className="flex flex-col gap-2">
                  {(
                    [
                      { id: "ani_phone_match", label: "Phone number match (ANI)" },
                      { id: "external_id", label: "External customer ID from context" },
                    ] as const
                  ).map((o) => (
                    <label key={o.id} className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={values.matchingStrategy?.includes(o.id)}
                        onChange={(e) => {
                          const next = new Set(values.matchingStrategy || []);
                          if (e.target.checked) next.add(o.id);
                          else next.delete(o.id);
                          const nextValues = Array.from(next) as IntakeForm["matchingStrategy"];
                          form.setValue("matchingStrategy", nextValues, { shouldValidate: true });
                        }}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>

                {form.formState.errors.matchingStrategy?.message && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.matchingStrategy.message}</p>
                )}
              </div>

              {values.matchingStrategy?.includes("ani_phone_match") && (
                <div>
                  <label className="text-sm font-medium">Phone normalization</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("phoneNormalization")}>
                    <option value="us_e164">US E.164 normalize (recommended)</option>
                    <option value="as_is">Keep as-is</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {values.matchingStrategy?.includes("external_id") && (
                <div>
                  <label className="text-sm font-medium">External ID field name in CRM</label>
                  <input className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" placeholder="e.g., customer_id" {...form.register("externalIdField")} />
                  {form.formState.errors.externalIdField && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.externalIdField.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium">Duplicate prevention (interactionId/callId)</label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Dedupe scope</label>
                    <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("dedupe.scope")}>
                      <option value="same_interaction_only">Same interaction only</option>
                      <option value="same_customer_same_day">Same customer, same day (advanced)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={values.dedupe?.allowMultipleEngagements}
                      onChange={(e) => form.setValue("dedupe.allowMultipleEngagements", e.target.checked)}
                    />
                    <span className="text-sm">
                      Allow multiple legitimate engagements for separate lifecycle events (e.g., attempts + completed)
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 6 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Context Injection</h2>

              <div>
                <label className="text-sm font-medium">Fields to show to the agent</label>
                <div className="mt-2 grid md:grid-cols-2 gap-2">
                  {CONTEXT_FIELD_OPTIONS.map((f) => (
                    <label key={f.id} className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={values.contextFields?.includes(f.id)}
                        onChange={(e) => {
                          const next = new Set(values.contextFields || []);
                          if (e.target.checked) next.add(f.id);
                          else next.delete(f.id);
                          form.setValue("contextFields", Array.from(next), { shouldValidate: true });
                        }}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                  {form.formState.errors.contextFields?.message && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.contextFields.message}</p>
                  )}
              </div>

              <div>
                <label className="text-sm font-medium">Custom fields (optional)</label>
                <input
                  className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800"
                  placeholder="Comma-separated field IDs (e.g., contact.membershipId, contact.segment)"
                  {...form.register("customContextFields")}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Where should the context appear?</label>
                <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("contextPlacement")}>
                  <option value="interaction_tab">Interaction tab (recommended)</option>
                  <option value="sidebar">Sidebar panel</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>
            </section>
          )}

          {step === 7 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Ownership & Audit</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Owner strategy</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("ownerStrategy")}>
                    <option value="map_agent_email">Map agent email &rarr; CRM user (recommended)</option>
                    <option value="fixed_owner">Always assign to a fixed user/queue</option>
                    <option value="unassigned">Leave unassigned</option>
                  </select>
                </div>

                {values.ownerStrategy === "fixed_owner" && (
                  <div>
                    <label className="text-sm font-medium">Fixed owner identifier</label>
                    <input className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" placeholder="e.g., revops_queue@company.com" {...form.register("fixedOwner")} />
                    {form.formState.errors.fixedOwner && (
                      <p className="text-xs text-red-600 mt-1">{form.formState.errors.fixedOwner.message}</p>
                    )}
                  </div>
                )}

                <div className="md:col-span-2 flex items-center gap-2">
                  <input type="checkbox" checked={values.storeCallId} onChange={(e) => form.setValue("storeCallId", e.target.checked)} />
                  <span className="text-sm">Store interaction ID in CRM</span>
                </div>

                {values.storeCallId && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">CRM field/property for interaction ID</label>
                    <input className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("callIdField")} />
                    {form.formState.errors.callIdField && (
                      <p className="text-xs text-red-600 mt-1">{form.formState.errors.callIdField.message}</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 8 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Reliability</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Expected volume</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("expectedVolume")}>
                    <option value="lt_100">&lt; 100 calls/day</option>
                    <option value="100_1000">100–1,000/day</option>
                    <option value="1000_10000">1,000–10,000/day</option>
                    <option value="gt_10000">10,000+/day</option>
                  </select>
                  {form.formState.errors.expectedVolume && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.expectedVolume.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Latency target</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("latencyTarget")}>
                    <option value="best_effort">Best effort</option>
                    <option value="under_2s">Under 2 seconds</option>
                    <option value="under_500ms">Under 500 ms</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Idempotency key</label>
                  <input className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("idempotencyKey")} />
                  <p className="text-xs text-gray-600 mt-1">Default is <code>interactionId</code>. Use the strongest unique interaction identifier available.</p>
                </div>
              </div>
            </section>
          )}

          {step === 9 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Exception handling (what happens when things go wrong?)</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">No contact match</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("exceptions.noContactMatch")}>
                    <option value="create_unassigned_activity">Create unassigned activity</option>
                    <option value="create_activity_and_flag_for_review">Create activity and flag for review</option>
                    <option value="skip_and_log">Skip and log</option>
                    <option value="require_agent_input">Require agent input</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">CRM API failure</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("exceptions.crmApiFailure")}>
                    <option value="retry_then_dlq">Retry then DLQ</option>
                    <option value="retry_then_alert">Retry then alert</option>
                    <option value="skip_and_log">Skip and log</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Partial data</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("exceptions.partialData")}>
                    <option value="create_with_defaults">Create with defaults</option>
                    <option value="create_and_flag_missing_fields">Create and flag missing fields</option>
                    <option value="skip_and_log">Skip and log</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Out of sync</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("exceptions.outOfSync")}>
                    <option value="daily_reconcile_report">Daily reconcile report</option>
                    <option value="manual_queue">Manual queue</option>
                    <option value="ignore">Ignore</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-gray-600">These are design decisions; implementation may vary.</p>
            </section>
          )}

          {step === 10 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Security</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data sensitivity</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("dataSensitivity")}>
                    <option value="low">No PII beyond phone/email</option>
                    <option value="pii">Contains PII (name/address/member ID)</option>
                    <option value="regulated">Regulated (HIPAA/PCI)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Logging preference</label>
                  <select className="mt-1 w-full border rounded-lg p-2 bg-neutral-900 text-neutral-100 border-neutral-800" {...form.register("logging")}>
                    <option value="mask_pii">Mask PII fields</option>
                    <option value="no_payload_logging">No payload logging</option>
                  </select>
                  {form.formState.errors.logging && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.logging.message}</p>
                  )}
                </div>

                {values.dataSensitivity === "regulated" && (
                  <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <div className="font-medium">Note</div>
                    <div className="text-gray-700">
                      Regulated data selected. For production use, a formal security/compliance review is required. This prototype remains evaluation-only.
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 11 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Review & Submit</h2>

              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200 text-gray-900">
                <div className="text-xs text-gray-600 mb-2">Normalized Intake JSON (preview)</div>
                <pre className="text-xs overflow-auto">{JSON.stringify(normalized, null, 2)}</pre>
              </div>

              {submitState === "done" && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                  <div className="font-medium">Submitted</div>
                  <div className="text-gray-700">{serverMsg}</div>
                </div>
              )}

              {submitState === "error" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                  <div className="font-medium">Error</div>
                  <div className="text-gray-700">{serverMsg}</div>
                </div>
              )}
            </section>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className={classNames(
                "px-4 py-2 rounded-lg border",
                step === 0 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
              )}
            >
              Back
            </button>

            {step < steps.length - 1 ? (
              <button type="submit" className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90">
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={submitState === "submitting"}
                className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitState === "submitting" ? "Submitting..." : "Submit intake"}
              </button>
            )}
          </div>
        </form>

        <footer className="text-xs text-gray-500">
          Prototype for evaluation and feedback only. Not a managed service or commercial offering.
        </footer>
      </div>
    </main>
  );
}
