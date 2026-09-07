// app/api/consultations/request/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { project_id, reason } = await request.json();
  if (!project_id) return NextResponse.json({ error: "project_id is required" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, expert_id, title")
    .eq("id", project_id)
    .single();

  if (!project || project.client_id !== user.id) {
    return NextResponse.json({ error: "Not your project" }, { status: 403 });
  }
  if (!project.expert_id) {
    return NextResponse.json({ error: "No expert assigned to this project yet" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("project_consultations")
    .insert({ project_id, requested_by: user.id, request_reason: reason ?? null })
    .select()
    .single();

  if (error) {
    // Unique index violation = one already exists for this project
    if (error.code === "23505") {
      return NextResponse.json({ error: "A consultation already exists for this project" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify admin — reusing the existing notifications table exactly as-is.
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  if (admins?.length) {
    await supabase.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.id,
        title: "Consultation Requested",
        body: `A client requested a consultation for "${project.title}".`,
        link: `/dashboard/admin/${project_id}`,
        entity_type: "consultation",
        entity_id: data.id,
      }))
    );
  }

  return NextResponse.json({ ok: true, consultation: data });
}