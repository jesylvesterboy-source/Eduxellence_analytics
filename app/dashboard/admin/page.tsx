import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../logout-button";
import BackHomeBar from "../_components/back-home-bar";
import NotificationBell from "../_components/notification-bell";
import RateSettingsCard from "./_components/rate-settings-card";

export default async function AdminDashboard() {
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

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, budget, created_at, client_id, expert_id, profiles!projects_client_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  const { data: stats } = await supabase.from("admin_stats").select("*").single();

  const statusLabels: Record<string, string> = {
    new: "New Request",
    in_review: "Under Review",
    assigned: "Assigned",
    in_progress: "In Progress",
    submitted: "Submitted (needs QA)",
    qa_review: "In QA",
    delivered: "Delivered to Client",
    revision: "Revision Requested",
    approved: "Approved",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <BackHomeBar backHref="/" backLabel="Back to Home" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem" }}>
              Admin Dashboard
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{profile?.full_name}</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link
              href="/dashboard/admin/payments"
              style={{
                background: "var(--gold)",
                color: "var(--ink)",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Payments
            </Link>
            <Link
              href="/dashboard/admin/promotions"
              style={{
                background: "var(--ink)",
                color: "var(--white)",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Promotions
            </Link>
            <Link
              href="/dashboard/admin/experts"
              style={{
                background: "#1a73e8",
                color: "var(--white)",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Applications
            </Link>
            <NotificationBell />
            <LogoutButton />
          </div>
        </div>

        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <StatCard label="Total Projects" value={stats.total_projects} />
            <StatCard label="New Requests" value={stats.pending_inquiries} />
            <StatCard label="Active" value={stats.active_projects} />
            <StatCard label="Awaiting Client" value={stats.awaiting_client} />
            <StatCard label="Completed" value={stats.completed_projects} />
            <StatCard label="Held Payments" value={`$${stats.held_payments || 0}`} />
          </div>
        )}

        <RateSettingsCard />

        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>All Projects</h2>

        {!projects || projects.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No projects yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {projects.map((p) => {
              const client = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/admin/${p.id}`}
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
                        Client: {client?.full_name || client?.email || "Unknown"} · {statusLabels[p.status] || p.status}
                        {!p.expert_id && p.status !== "new" ? " · No expert assigned" : ""}
                      </div>
                    </div>
                    <span style={{ color: "var(--gold)", fontSize: "0.85rem" }}>Manage →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--gold-dark)" }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}