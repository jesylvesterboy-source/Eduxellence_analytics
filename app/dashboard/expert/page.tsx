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
    .select("full_name, role, expert_level_id, application_status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "expert") redirect("/dashboard");
  if (profile?.application_status !== "approved") redirect("/dashboard/expert/apply");

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

  const { data: currentLevel } = await supabase
    .from("expert_levels")
    .select("id, level_order, level_name, badge, revenue_share")
    .eq("id", profile?.expert_level_id)
    .maybeSingle();

  const { data: nextLevel } = await supabase
    .from("expert_levels")
    .select("level_name, revenue_share, min_projects, min_reviews, min_rating, min_on_time_pct")
    .eq("level_order", (currentLevel?.level_order ?? 1) + 1)
    .maybeSingle();

  const { data: statsRows } = await supabase.rpc("fn_expert_stats", { p_expert_id: user.id });
  const stats = statsRows?.[0] ?? { projects_count: 0, reviews_count: 0, avg_rating: null, on_time_pct: null };

  const { data: earningsRows } = await supabase
    .from("expert_earnings")
    .select("expert_earnings, status")
    .eq("expert_id", user.id);

  const pendingTotal = (earningsRows || []).filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.expert_earnings), 0);
  const availableTotal = (earningsRows || []).filter((e) => e.status === "available").reduce((s, e) => s + Number(e.expert_earnings), 0);
  const paidTotal = (earningsRows || []).filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.expert_earnings), 0);
  const lifetimeTotal = (earningsRows || []).reduce((s, e) => s + Number(e.expert_earnings), 0);

  const { data: settingsRow } = await supabase
    .from("platform_settings")
    .select("mid_month_payout_day, end_month_payout_day")
    .eq("id", 1)
    .single();

  const today = new Date();
  const mid = settingsRow?.mid_month_payout_day ?? 15;
  const end = settingsRow?.end_month_payout_day ?? 28;
  let nextPaymentDate: Date;
  if (today.getDate() < mid) {
    nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), mid);
  } else if (today.getDate() < end) {
    nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), end);
  } else {
    nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, mid);
  }

  const statusLabels: Record<string, string> = {
    assigned: "Newly Assigned",
    offered: "Offer Pending Your Response",
    in_progress: "In Progress",
    submitted: "Submitted — Awaiting Admin QA",
    qa_review: "Admin Reviewing",
    delivered: "Delivered to Client",
    revision: "Revision Requested",
    approved: "Approved by Client",
    completed: "Completed",
    declined: "Declined",
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
            <Link
              href="/dashboard/expert/payout-profile"
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
              Payout Details
            </Link>
            <Link
              href="/dashboard/expert/payouts"
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
              Payment History
            </Link>
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

        {currentLevel && (
          <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Your Eduxellence Growth Plan
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "0.25rem" }}>{currentLevel.level_name}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--gold-dark)", fontWeight: 600 }}>
                  {Math.round(currentLevel.revenue_share * 100)}% Expert Share
                </div>
              </div>
              <span style={{ background: "var(--gold-light)", color: "var(--ink)", padding: "0.3rem 0.8rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                {currentLevel.badge}
              </span>
            </div>

            {nextLevel ? (
              <>
                <div style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  Next: <strong>{nextLevel.level_name}</strong> — {Math.round(nextLevel.revenue_share * 100)}% share
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.8rem" }}>
                  <ProgressRow label="Projects" value={stats.projects_count} target={nextLevel.min_projects} />
                  <ProgressRow label="Reviews" value={stats.reviews_count} target={nextLevel.min_reviews} />
                  <ProgressRow label="Avg Rating" value={stats.avg_rating ?? 0} target={nextLevel.min_rating} decimal />
                  <ProgressRow label="On-Time" value={stats.on_time_pct ?? 0} target={nextLevel.min_on_time_pct} suffix="%" />
                </div>
                {stats.projects_count >= nextLevel.min_projects &&
                stats.reviews_count >= nextLevel.min_reviews &&
                (stats.avg_rating ?? 0) >= nextLevel.min_rating &&
                (stats.on_time_pct ?? 0) >= nextLevel.min_on_time_pct ? (
                  <p style={{ fontSize: "0.8rem", color: "#1e8449", fontWeight: 600, marginTop: "0.9rem" }}>
                    🎯 You&apos;ve met the requirements for {nextLevel.level_name}. Your promotion is awaiting Admin review.
                  </p>
                ) : (
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.9rem" }}>
                    Keep delivering great work to progress toward {nextLevel.level_name}.
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--gold-dark)", fontWeight: 600 }}>
                You&apos;ve reached the highest level — Elite Expert. 🎉
              </p>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <WalletCard label="Pending Earnings" value={`$${pendingTotal.toLocaleString()}`} color="var(--gold-dark)" />
          <WalletCard label="Available for Payout" value={`$${availableTotal.toLocaleString()}`} color="#1e8449" />
          <WalletCard label="Paid" value={`$${paidTotal.toLocaleString()}`} color="var(--muted)" />
          <WalletCard label="Lifetime Earnings" value={`$${lifetimeTotal.toLocaleString()}`} color="var(--ink)" />
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
          Next payment date: <strong>{nextPaymentDate.toLocaleDateString()}</strong>
        </p>

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

function ProgressRow({ label, value, target, decimal = false, suffix = "" }: { label: string; value: number; target: number; decimal?: boolean; suffix?: string }) {
  const met = value >= target;
  const display = decimal ? value.toFixed(1) : Math.round(value);
  return (
    <div style={{ background: "var(--cream-dark)", borderRadius: "6px", padding: "0.5rem 0.7rem" }}>
      <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{label}</div>
      <div style={{ fontWeight: 600, color: met ? "#1e8449" : "var(--ink)" }}>
        {display}{suffix} / {decimal ? target.toFixed(1) : target}{suffix}
      </div>
    </div>
  );
}

function WalletCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.1rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{label}</div>
    </div>
  );
}