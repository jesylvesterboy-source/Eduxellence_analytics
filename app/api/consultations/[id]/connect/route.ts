// app/api/consultations/[id]/connect/route.ts
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
    .update({ status: "active", initiated_by: user.id, connected_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, project_id")
    .single();

  if (error || !consultation) {
    return NextResponse.json({ error: error?.message ?? "Consultation not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, expert_id, title")
    .eq("id", consultation.project_id)
    .single();

  if (project) {
    await supabase.from("notifications").insert([
      {
        user_id: project.client_id,
        title: "Connected with Your Expert",
        body: `You've been connected with the expert assigned to "${project.title}". You can now communicate securely through your project consultation room.`,
        link: `/dashboard/client/${consultation.project_id}`,
        entity_type: "consultation",
        entity_id: consultation.id,
      },
      {
        user_id: project.expert_id,
        title: "Connected with Client",
        body: `You've been connected with the client for "${project.title}". Please review the project requirements and respond through the consultation room.`,
        link: `/dashboard/expert/${consultation.project_id}`,
        entity_type: "consultation",
        entity_id: consultation.id,
      },
    ]);
  }

  return NextResponse.json({ ok: true, consultation });
}