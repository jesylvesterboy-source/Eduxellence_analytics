"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Row = {
  earning_id: string;
  expert_id: string;
  expert_name: string | null;
  project_id: string;
  project_title: string | null;
  milestone_id: string | null;
  milestone_title: string | null;
  client_payment_reference: string | null;
  gross_client_payment: number;
  expert_share_pct: number | null;
  expert_earnings: number;
  eduxellence_share: number;
  earning_status: string;
  payout_batch_id: string | null;
  payout_cycle: string | null;
  payout_item_status: string | null;
  payout_currency: string | null;
  payout_method: string | null;
  payout_reference: string | null;
  release_date: string | null;
  released_by_admin_id: string | null;
  released_by_admin_name: string | null;
  earning_created_at: string;
};

export default function AdminPayoutLedgerPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState("");
  const [expertFilter, setExpertFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("v_payout_ledger").select("*").order("earning_created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const cycles = Array.from(new Set(rows.map((r) => r.payout_cycle).filter(Boolean))) as string[];
  const statuses = Array.from(new Set(rows.map((r) => r.earning_status)));

  const filtered = rows.filter((r) => {
    if (statusFilter && r.earning_status !== statusFilter) return false;
    if (cycleFilter && r.payout_cycle !== cycleFilter) return false;
    if (expertFilter && !(r.expert_name || "").toLowerCase().includes(expertFilter.toLowerCase())) return false;
    return true;
  });

  const totalGross = filtered.reduce((s, r) => s + Number(r.gross_client_payment || 0), 0);
  const totalExpert = filtered.reduce((s, r) => s + Number(r.expert_earnings || 0), 0);
  const totalEdux = filtered.reduce((s, r) => s + Number(r.eduxellence_share || 0), 0);

  function exportCsv() {
    const headers = [
      "Earning ID", "Expert", "Project", "Milestone", "Client Payment Ref", "Gross Payment",
      "Expert %", "Expert Earnings", "Eduxellence Share", "Earning Status",
      "Payout Cycle", "Payout Status", "Currency", "Method", "Payout Ref", "Release Date", "Released By", "Created At",
    ];
    const lines = filtered.map((r) => [
      r.earning_id, r.expert_name || "", r.project_title || "", r.milestone_title || "",
      r.client_payment_reference || "", r.gross_client_payment, r.expert_share_pct ?? "",
      r.expert_earnings, r.eduxellence_share, r.earning_status,
      r.payout_cycle || "", r.payout_item_status || "", r.payout_currency || "", r.payout_method || "",
      r.payout_reference || "", r.release_date || "", r.released_by_admin_name || "", r.earning_created_at,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payout-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem" }}>Payout Ledger</h1>
          <button onClick={exportCsv} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
            Export CSV
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterStyle}>
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={cycleFilter} onChange={(e) => setCycleFilter(e.target.value)} style={filterStyle}>
            <option value="">All cycles</option>
            {cycles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="Filter by expert name..." value={expertFilter} onChange={(e) => setExpertFilter(e.target.value)} style={{ ...filterStyle, flex: 1, minWidth: "200px" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard label="Total Gross" value={`$${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          <StatCard label="Total Expert Earnings" value={`$${totalExpert.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          <StatCard label="Total Eduxellence Share" value={`$${totalEdux.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No records match these filters.
          </div>
        ) : (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ background: "var(--cream-dark)", textAlign: "left" }}>
                  {["Expert", "Project", "Milestone", "Gross", "Expert %", "Expert Earnings", "Eduxellence", "Status", "Cycle", "Payout Status", "Method", "Release Date"].map((h) => (
                    <th key={h} style={{ padding: "0.6rem 0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.earning_id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={cellStyle}>{r.expert_name || "—"}</td>
                    <td style={cellStyle}>{r.project_title || "—"}</td>
                    <td style={cellStyle}>{r.milestone_title || "—"}</td>
                    <td style={cellStyle}>${Number(r.gross_client_payment).toFixed(2)}</td>
                    <td style={cellStyle}>{r.expert_share_pct ? `${Math.round(r.expert_share_pct * 100)}%` : "—"}</td>
                    <td style={cellStyle}>${Number(r.expert_earnings).toFixed(2)}</td>
                    <td style={cellStyle}>${Number(r.eduxellence_share).toFixed(2)}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, textTransform: "capitalize", color: r.earning_status === "paid" ? "#1e8449" : r.earning_status === "available" ? "var(--gold-dark)" : "var(--muted)" }}>
                      {r.earning_status}
                    </td>
                    <td style={cellStyle}>{r.payout_cycle || "—"}</td>
                    <td style={{ ...cellStyle, textTransform: "capitalize" }}>{r.payout_item_status || "—"}</td>
                    <td style={{ ...cellStyle, textTransform: "capitalize" }}>{r.payout_method?.replace("_", " ") || "—"}</td>
                    <td style={cellStyle}>{r.release_date ? new Date(r.release_date).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--gold-dark)" }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}

const filterStyle: React.CSSProperties = { padding: "0.55rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" };
const cellStyle: React.CSSProperties = { padding: "0.55rem 0.8rem", whiteSpace: "nowrap" };