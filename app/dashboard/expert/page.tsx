import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../logout-button";
import BackHomeBar from "../_components/back-home-bar";
import NotificationBell from "../_components/notification-bell";

export default async function ExpertDashboard() {
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

  if (profile?.role !== "expert") redirect("/dashboard");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, deadline, created_at")
    .eq("expert_id", user.id)
    .order("created_at", { ascending: false });

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, projects!inner(expert_id)")
    .eq("projects.expert_id", user.id);

  const reviewCount = reviews?.length ?? 0;
  const avgRating =
    reviewCount > 0
      ? (reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
      : null;

  const statusLabels: Record<string, string> = {
    assigned: "Newly Assigned",
    in_progress: "In Progress",
    submitted: "Submitted — Awaiting Admin QA",
    qa_review: "Admin Reviewing",
    delivered: "Delivered to Client",
    revision: "Revision Requested",
    approved: "Approved by Client",
    completed: "Completed",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <BackHomeBar backHref="/" backLabel="Back to Home" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem" }}>
              Welcome, {profile?.full_name || "Expert"}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Your assigned projects</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <NotificationBell />
            <LogoutButton />
          </div>
        </div>

        {reviewCount > 0 && (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--gold-dark)" }}>{avgRating}</div>
            <div>
              <div style={{ fontSize: "1rem", color: "var(--gold)" }}>
                {"★".repeat(Math.round(Number(avgRating)))}{"☆".repeat(5 - Math.round(Number(avgRating)))}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Based on {reviewCount} review{reviewCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>
        )}

        {!projects || projects.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No projects assigned yet. Admin will assign work here when available.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/expert/${p.id}`}
                style={{
                  display: "block",
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1.1rem 1.5rem",
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{p.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      {statusLabels[p.status] || p.status}
                      {p.deadline ? ` · Due ${new Date(p.deadline).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <span style={{ color: "var(--gold)", fontSize: "0.85rem" }}>Open →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}