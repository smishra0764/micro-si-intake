import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.RESEND_API_KEY;
    const receiver = process.env.INTAKE_RECEIVER_EMAIL;

    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }
    if (!receiver) {
      throw new Error("Missing INTAKE_RECEIVER_EMAIL");
    }

    const resend = new Resend(apiKey);

    const crm = body?.systems?.crm ?? body?.crm ?? "N/A";
    const contactCenter = body?.systems?.contactCenterPlatform ?? body?.systems?.contactCenter ?? body?.contactCenterPlatform ?? body?.contactCenter ?? "N/A";
    const agentWorkspace = body?.systems?.agentWorkspace ?? body?.agentWorkspace ?? "N/A";
    const triggerEvent = body?.trigger?.event ?? body?.triggerEvent ?? "N/A";
    const triggerChannel = body?.trigger?.channel ?? body?.channel ?? "N/A";
    const triggerDirection = body?.trigger?.direction ?? body?.direction ?? "N/A";

    const text = [
      "New CRM <-> Contact Center Intake",
      "",
      `CRM: ${typeof crm === "string" ? crm : JSON.stringify(crm)}`,
      `Contact Center Platform: ${typeof contactCenter === "string" ? contactCenter : JSON.stringify(contactCenter)}`,
      `Agent Workspace: ${typeof agentWorkspace === "string" ? agentWorkspace : JSON.stringify(agentWorkspace)}`,
      `Trigger event: ${typeof triggerEvent === "string" ? triggerEvent : JSON.stringify(triggerEvent)}`,
      `Trigger channel: ${typeof triggerChannel === "string" ? triggerChannel : JSON.stringify(triggerChannel)}`,
      `Trigger direction: ${typeof triggerDirection === "string" ? triggerDirection : JSON.stringify(triggerDirection)}`,
      "",
      "Full intake JSON:",
      JSON.stringify(body, null, 2),
    ].join("\n");

    await resend.emails.send({
      from: "Micro-SI Intake <onboarding@resend.dev>",
      to: receiver,
      subject: "New CRM <-> Contact Center Intake Received",
      text,
    });

    return NextResponse.json({
      ok: true,
      message: "Thanks - intake received.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to send intake email" },
      { status: 500 }
    );
  }
}
