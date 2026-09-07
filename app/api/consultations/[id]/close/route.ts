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

  const { data: existing } = await supabase
    .from("project_consultations")
    .select("id, project_id, status")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  if (!["active", "reopened"].includes(existing.status)) {
    return NextResponse.json({ error: `Cannot close a consultation in status: ${existing.status}` }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, expert_id, title")
    .eq("id", existing.project_id)
    .single();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  const isParticipant = project && (project.client_id === user.id || project.expert_id === user.id);

  if (!isAdmin && !isParticipant) {
    return NextResponse.json({ error: "Not authorized to close this consultation" }, { status: 403 });
  }

  const { requirements_clarified, summary } = await request.json().catch(() => ({}));

  const { data: consultation, error } = await supabase
    .from("project_consultations")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      requirements_clarified: requirements_clarified ?? null,
      summary: summary ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (project) {
    const otherParty = user.id === project.client_id ? project.expert_id : project.client_id;
    if (otherParty) {
      await supabase.from("notifications").insert({
        user_id: otherParty,
        title: "Consultation Closed",
        body: `The consultation for "${project.title}" has been marked complete.`,
        link: `/dashboard/${otherParty === project.expert_id ? "expert" : "client"}/${existing.project_id}`,
        entity_type: "consultation",
        entity_id: consultation.id,
      });
    }
  }

  return NextResponse.json({ ok: true, consultation });
}