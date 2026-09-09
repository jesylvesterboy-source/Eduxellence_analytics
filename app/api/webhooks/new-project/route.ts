import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";

const ADMIN_EMAIL = "j.sylvester@eduxellence.org";
const SITE_URL = "https://experts.eduxellence.org";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  // Verify this call genuinely came from Supabase's Database Webhook, not
  // an arbitrary internet request -- this route uses the service role key,
  // so it must never be reachable by an unauthenticated caller.
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();

  // Supabase Database Webhook payload shape for an INSERT event:
  // { type: "INSERT", table: "projects", schema: "public", record: {...}, old_record: null }
  if (payload.type !== "INSERT" || payload.table !== "projects") {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  const project = payload.record;
  const supabase = getServiceClient();

  // Atomic claim: only proceed if this row hasn't already been notified.
  // This is the dedup guard -- if Supabase ever retries this webhook
  // delivery, the second attempt finds admin_notified_at already set and
  // exits immediately without sending a second email.
  const { data: claimed, error: claimError } = await supabase
    .from("projects")
    .update({ admin_notified_at: new Date().toISOString() })
    .eq("id", project.id)
    .is("admin_notified_at", null)
    .select("id, title, service_category, description, budget, status, client_id, created_at")
    .single();

  if (claimError || !claimed) {
    // Either already notified, or the row vanished -- either way, nothing
    // to do. Not an error worth logging loudly.
    return NextResponse.json({ skipped: true }, { status: 200 });
  }

  try {
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", claimed.client_id)
      .single();

    const submittedAt = new Date(claimed.created_at).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const adminLink = `${SITE_URL}/dashboard/admin/${claimed.id}`;

    const html = `
      <h2>New Project Request</h2>
      <p><strong>Title:</strong> ${escapeHtml(claimed.title)}</p>
      <p><strong>Category:</strong> ${escapeHtml(claimed.service_category)}</p>
      <p><strong>Client:</strong> ${escapeHtml(clientProfile?.full_name || "Unknown")} (${escapeHtml(clientProfile?.email || "no email on file")})</p>
      <p><strong>Budget:</strong> ${claimed.budget != null ? `$${claimed.budget}` : "Not specified"}</p>
      <p><strong>Description:</strong><br>${escapeHtml(claimed.description || "").replace(/\n/g, "<br>")}</p>
      <p><strong>Submitted:</strong> ${submittedAt}</p>
      <p><strong>Project ID:</strong> ${claimed.id}</p>
      <p><a href="${adminLink}">View this project in Super Admin</a></p>
    `;

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New Project Request: ${claimed.title}`,
      html,
    });
  } catch (err) {
    // Deliberately non-blocking: the project row was already created and
    // committed before this webhook ever fired. A Resend outage or a
    // malformed email must never look like a failed signup. Log for
    // investigation and move on.
    console.error("Failed to send new-project admin notification email:", {
      projectId: claimed.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}