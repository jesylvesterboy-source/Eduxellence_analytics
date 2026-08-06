import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../logout-button";
import BackHomeBar from "../_components/back-home-bar";
import NotificationBell from "../_components/notification-bell";

export default async function ClientDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "client") redirect("/dashboard");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, budget, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const statusLabels: Record<string, string> = {
    new: "New Request",
    in_review: "Under Review",
    assigned: "Assigned to Expert",
    in_progress: "In Progress",
    submitted: "Submitted for QA",
    qa_review: "Quality Check",
    delivered: "Delivered — Awaiting Your Review",
    revision: "Revision Requested",
    approved: "Approved",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <BackHomeBar backHref="/" backLabel="Back to Home" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem" }}>
              Welcome, {profile?.full_name || "there"}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Your projects with Eduxellence Solutions</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <NotificationBell />
            <LogoutButton />
          </div>
        </div>

        <Link
          href="/dashboard/client/new"
          style={{
            display: "inline-block",
            background: "var(--gold)",
            color: "var(--ink)",
            padding: "0.75rem 1.5rem",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "0.9rem",
            textDecoration: "none",
            marginBottom: "2rem",
          }}
        >
          + Request a New Project
        </Link>

        {!projects || projects.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No projects yet. Click above to submit your first request.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/client/${p.id}`}
                style={{
                  display: "block",
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1.25rem 1.5rem",
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{p.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      {statusLabels[p.status] || p.status}
                      {p.budget ? ` · $${p.budget}` : ""}
                    </div>
                  </div>
                  <span style={{ color: "var(--gold)", fontSize: "0.85rem" }}>View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}