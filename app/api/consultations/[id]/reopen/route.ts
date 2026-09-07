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

  const { data: consultation, error } = await supabase
    .from("project_consultations")
    .update({ status: "reopened", closed_at: null, closed_by: null })
    .eq("id", id)
    .eq("status", "closed")
    .select("id, project_id")
    .single();

  if (error || !consultation) {
    return NextResponse.json({ error: error?.message ?? "Consultation not found or not closed" }, { status: 404 });
  }

  const { data: project } = await supabase.from("projects").select("client_id, expert_id, title").eq("id", consultation.project_id).single();
  if (project) {
    await supabase.from("notifications").insert([
      { user_id: project.client_id, title: "Consultation Reopened", body: `The consultation for "${project.title}" has been reopened.`, link: `/dashboard/client/${consultation.project_id}`, entity_type: "consultation", entity_id: consultation.id },
      { user_id: project.expert_id, title: "Consultation Reopened", body: `The consultation for "${project.title}" has been reopened.`, link: `/dashboard/expert/${consultation.project_id}`, entity_type: "consultation", entity_id: consultation.id },
    ]);
  }

  return NextResponse.json({ ok: true, consultation });
}