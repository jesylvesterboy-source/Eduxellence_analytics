export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { reason } = await request.json().catch(() => ({ reason: null }));

  const { data: consultation, error } = await supabase
    .from("project_consultations")
    .update({ status: "declined", decline_reason: reason ?? null })
    .eq("id", id)
    .eq("status", "requested") // can only decline a pending request, not an active one
    .select("id, project_id")
    .single();

  if (error || !consultation) {
    return NextResponse.json({ error: error?.message ?? "Consultation not found or not in requested state" }, { status: 404 });
  }

  const { data: project } = await supabase.from("projects").select("client_id, title").eq("id", consultation.project_id).single();
  if (project) {
    await supabase.from("notifications").insert({
      user_id: project.client_id,
      title: "Consultation Request Declined",
      body: `Your consultation request for "${project.title}" was declined.${reason ? ` Reason: ${reason}` : ""}`,
      link: `/dashboard/client/${consultation.project_id}`,
      entity_type: "consultation",
      entity_id: consultation.id,
    });
  }

  return NextResponse.json({ ok: true, consultation });
}