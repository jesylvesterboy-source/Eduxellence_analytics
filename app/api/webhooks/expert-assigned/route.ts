import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";

const SITE_URL = "https://analytics.eduxellence.org";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();

  // Supabase Database Webhook payload shape for an UPDATE event:
  // { type: "UPDATE", table: "projects", record: {...}, old_record: {...} }
  if (payload.type !== "UPDATE" || payload.table !== "projects") {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  const project = payload.record;
  const previous = payload.old_record;

  // Only a genuine NEW assignment: expert_id was null/different before,
  // and is now set. This ignores every other kind of project update
  // (status changes, deadline edits, etc.) without needing a second,
  // narrower webhook trigger configured in Supabase.
  const isNewAssignment =
    project.expert_id && project.expert_id !== previous.expert_id;

  if (!isNewAssignment) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  const supabase = getServiceClient();

  // Same atomic-claim dedup guard as the new-project webhook: if this
  // delivery is a retry, expert_notified_at is already set and the
  // update below affects zero rows.
  const { data: claimed, error: claimError } = await supabase
    .from("projects")
    .update({ expert_notified_at: new Date().toISOString() })
    .eq("id", project.id)
    .is("expert_notified_at", null)
    .select("id, title, description, service_category, budget, deadline, expert_id, client_id")
    .single();

  if (claimError || !claimed) {
    return NextResponse.json({ skipped: true }, { status: 200 });
  }

  try {
    const { data: expertProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", claimed.expert_id)
      .single();

    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", claimed.client_id)
      .single();

    if (!expertProfile?.email) {
      console.error("Expert assignment email skipped — no email on file:", {
        projectId: claimed.id,
        expertId: claimed.expert_id,
      });
      return NextResponse.json({ ok: true, skipped_no_email: true });
    }

    const projectLink = `${SITE_URL}/dashboard/expert/${claimed.id}`;

    const html = `
      <h2>You've Been Assigned a New Project</h2>
      <p><strong>Project:</strong> ${escapeHtml(claimed.title)}</p>
      <p><strong>Category:</strong> ${escapeHtml(claimed.service_category)}</p>
      <p><strong>Client:</strong> ${escapeHtml(clientProfile?.full_name || "Unknown")}</p>
      <p><strong>Budget:</strong> ${claimed.budget != null ? `$${claimed.budget}` : "Not specified"}</p>
      <p><strong>Deadline:</strong> ${claimed.deadline || "Not specified"}</p>
      <p><strong>Description:</strong><br>${escapeHtml(claimed.description || "").replace(/\n/g, "<br>")}</p>
      <p><a href="${projectLink}">View this project in your dashboard</a></p>
    `;

    await sendEmail({
      to: expertProfile.email,
      subject: `New Project Assigned: ${claimed.title}`,
      html,
    });
  } catch (err) {
    // Non-blocking, same reasoning as new-project: the assignment is
    // already committed. A Resend hiccup must never look like a failed
    // assignment. Log and move on.
    console.error("Failed to send expert-assignment email:", {
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