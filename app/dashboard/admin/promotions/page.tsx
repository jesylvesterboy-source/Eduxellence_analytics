"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type PendingReview = {
  id: string;
  expert_id: string;
  status: string;
  projects_count: number;
  reviews_count: number;
  avg_rating: number | null;
  on_time_pct: number | null;
  created_at: string;
  expert_name: string | null;
  current_level_name: string;
  eligible_level_name: string;
  eligible_revenue_share: number;
};

type ExpertOverviewRow = {
  expert_id: string;
  full_name: string | null;
  current_level_name: string;
  badge: string;
  revenue_share: number;
  projects_count: number;
  reviews_count: number;
  avg_rating: number | null;
  on_time_pct: number | null;
  performance_score: number;
  pending_earnings: number;
  available_earnings: number;
  promotion_status: string;
  next_level_name: string | null;
  next_level_revenue_share: number | null;
  growth_progress: number;
  total_count: number;
};

const PAGE_SIZE = 20;

export default function AdminPromotionsPage() {
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [experts, setExperts] = useState<ExpertOverviewRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    const { data: reviews } = await supabase
      .from("expert_promotion_reviews")
      .select(
        "id, expert_id, status, projects_count, reviews_count, avg_rating, on_time_pct, created_at, profiles!expert_promotion_reviews_expert_id_fkey(full_name), current:expert_levels!expert_promotion_reviews_current_level_id_fkey(level_name), eligible:expert_levels!expert_promotion_reviews_eligible_level_id_fkey(level_name, revenue_share)"
      )
      .eq("status", "eligible")
      .order("created_at", { ascending: true });

    const mapped: PendingReview[] = (reviews || []).map((r: any) => ({
      id: r.id,
      expert_id: r.expert_id,
      status: r.status,
      projects_count: r.projects_count,
      reviews_count: r.reviews_count,
      avg_rating: r.avg_rating,
      on_time_pct: r.on_time_pct,
      created_at: r.created_at,
      expert_name: r.profiles?.full_name ?? null,
      current_level_name: r.current?.level_name ?? "—",
      eligible_level_name: r.eligible?.level_name ?? "—",
      eligible_revenue_share: r.eligible?.revenue_share ?? 0,
    }));
    setPending(mapped);
  }, [supabase]);

  // Single RPC call — no loop, one aggregated query returns the whole page
  const loadExperts = useCallback(
    async (pageNum: number) => {
      const { data, error } = await supabase.rpc("fn_admin_expert_overview", {
        p_limit: PAGE_SIZE,
        p_offset: pageNum * PAGE_SIZE,
      });
      if (!error && data) {
        setExperts(data);
        setTotalCount(data[0]?.total_count ?? 0);
      }
    },
    [supabase]
  );

  const loadAll = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAdminId(user?.id ?? null);
      await Promise.all([loadPending(), loadExperts(pageNum)]);
      setLoading(false);
    },
    [supabase, loadPending, loadExperts]
  );

  useEffect(() => {
    loadAll(page);
  }, [page, loadAll]);

  async function approvePromotion(reviewId: string) {
    if (!adminId) return;
    if (!confirm("Approve this promotion? This immediately changes the expert's revenue share for future projects.")) return;
    setActingId(reviewId);
    const { error } = await supabase.rpc("fn_approve_promotion", {
      p_review_id: reviewId,
      p_admin_id: adminId,
      p_notes: null,
    });
    setActingId(null);
    if (error) {
      alert("Could not approve promotion: " + error.message);
      return;
    }
    loadAll(page);
  }

  async function deferOrDecline(reviewId: string, status: "deferred" | "declined") {
    if (!adminId) return;
    const reason = prompt(`Reason for ${status === "deferred" ? "deferring" : "declining"} this promotion (optional):`) ?? null;
    setActingId(reviewId);
    const { error } = await supabase
      .from("expert_promotion_reviews")
      .update({ status, reviewed_by: adminId, reviewed_at: new Date().toISOString(), admin_notes: reason })
      .eq("id", reviewId);
    setActingId(null);
    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    loadAll(page);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Expert Promotions
        </h1>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        ) : (
          <>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Pending Review ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", textAlign: "center", color: "var(--muted)", marginBottom: "2rem" }}>
                No experts currently eligible for promotion.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                {pending.map((p) => (
                  <div key={p.id} style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <strong>{p.expert_name || "Unknown Expert"}</strong>
                        <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                          {p.current_level_name} → {p.eligible_level_name} ({Math.round(p.eligible_revenue_share * 100)}% share)
                        </div>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem" }}>
                      <span>Projects: {p.projects_count}</span>
                      <span>Reviews: {p.reviews_count}</span>
                      <span>Rating: {p.avg_rating}</span>
                      <span>On-time: {p.on_time_pct}%</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                      <button onClick={() => approvePromotion(p.id)} disabled={actingId === p.id} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                        Approve Promotion
                      </button>
                      <button onClick={() => deferOrDecline(p.id, "deferred")} disabled={actingId === p.id} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                        Defer
                      </button>
                      <button onClick={() => deferOrDecline(p.id, "declined")} disabled={actingId === p.id} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>All Experts ({totalCount})</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.8rem" }}>
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={pagerBtn}>← Prev</button>
                <span style={{ color: "var(--muted)" }}>Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={pagerBtn}>Next →</button>
              </div>
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "var(--cream-dark)", textAlign: "left" }}>
                    <th style={thStyle}>Expert</th>
                    <th style={thStyle}>Level</th>
                    <th style={thStyle}>Share</th>
                    <th style={thStyle}>Projects</th>
                    <th style={thStyle}>Reviews</th>
                    <th style={thStyle}>Rating</th>
                    <th style={thStyle}>On-Time</th>
                    <th style={thStyle}>Score</th>
                    <th style={thStyle}>Pending $</th>
                    <th style={thStyle}>Available $</th>
                    <th style={thStyle}>Next Level</th>
                    <th style={thStyle}>Progress</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {experts.map((e) => (
                    <tr key={e.expert_id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={tdStyle}>{e.full_name || "Unknown"}</td>
                      <td style={tdStyle}>{e.current_level_name} <span style={{ color: "var(--muted)" }}>({e.badge})</span></td>
                      <td style={tdStyle}>{Math.round(e.revenue_share * 100)}%</td>
                      <td style={tdStyle}>{e.projects_count}</td>
                      <td style={tdStyle}>{e.reviews_count}</td>
                      <td style={tdStyle}>{e.avg_rating ?? "—"}</td>
                      <td style={tdStyle}>{e.on_time_pct !== null ? `${e.on_time_pct}%` : "—"}</td>
                      <td style={tdStyle}>{e.performance_score}</td>
                      <td style={tdStyle}>${e.pending_earnings.toLocaleString()}</td>
                      <td style={tdStyle}>${e.available_earnings.toLocaleString()}</td>
                      <td style={tdStyle}>{e.next_level_name ?? "Max level"}</td>
                      <td style={tdStyle}>
                        <div style={{ background: "var(--cream-dark)", borderRadius: "4px", height: "6px", width: "60px", overflow: "hidden" }}>
                          <div style={{ background: "var(--gold)", height: "100%", width: `${e.growth_progress}%` }} />
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: e.promotion_status === "eligible" ? "#1e8449" : e.promotion_status === "max_level" ? "var(--muted)" : "var(--gold-dark)" }}>
                        {e.promotion_status === "eligible" ? "Eligible" : e.promotion_status === "max_level" ? "Max Level" : "Progressing"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pagerBtn: React.CSSProperties = {
  background: "var(--cream-dark)",
  border: "1px solid var(--border)",
  padding: "0.3rem 0.7rem",
  borderRadius: "6px",
  cursor: "pointer",
};

const thStyle: React.CSSProperties = { padding: "0.6rem 0.8rem", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "0.6rem 0.8rem", whiteSpace: "nowrap" };