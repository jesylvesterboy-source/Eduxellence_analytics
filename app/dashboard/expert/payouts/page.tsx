"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";
import { generatePayoutStatementPDF } from "@/lib/payout-statement";

type BatchItem = {
  id: string;
  batch_id: string;
  amount: number;
  currency: string;
  status: string;
  transaction_reference: string | null;
  paid_at: string | null;
  payout_profile_id: string | null;
  payout_batches: { period_label: string; cutoff_date: string } | null;
};

export default function ExpertPayoutsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("payout_batch_items")
      .select("id, batch_id, amount, currency, status, transaction_reference, paid_at, payout_profile_id, payout_batches(period_label, cutoff_date)")
      .eq("expert_id", user.id)
      .order("created_at", { ascending: false });

    setItems((data as any) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadStatement(item: BatchItem) {
    setDownloadingId(item.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, expert_levels!profiles_expert_level_id_fkey(level_name)")
      .eq("id", user.id)
      .single();

    const { data: payoutProfile } = item.payout_profile_id
      ? await supabase.from("payout_profiles").select("method, account_number, bank_name").eq("id", item.payout_profile_id).single()
      : { data: null };

    const { data: earnings } = await supabase
      .from("expert_earnings")
      .select("expert_earnings, expert_share_pct, project_id, projects(title)")
      .eq("payout_batch_item_id", item.id);

    const projects = (earnings || []).map((e: any) => ({
      title: e.projects?.title || "Untitled project",
      earnings: Number(e.expert_earnings),
      sharePct: e.expert_share_pct,
    }));

    const masked = payoutProfile?.account_number
      ? "****" + payoutProfile.account_number.slice(-4)
      : "—";

    generatePayoutStatementPDF({
      expertName: profile?.full_name || "Expert",
      levelName: (profile as any)?.expert_levels?.level_name || "—",
      periodLabel: item.payout_batches?.period_label || "—",
      cutoffDate: item.payout_batches?.cutoff_date || new Date().toISOString(),
      amount: Number(item.amount),
      currency: item.currency,
      status: item.status,
      transactionReference: item.transaction_reference,
      payoutMethod: payoutProfile?.bank_name || payoutProfile?.method || "—",
      maskedAccount: masked,
      projects,
    });

    setDownloadingId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Payment History
        </h1>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        ) : items.length === 0 ? (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
            No payouts yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {items.map((it) => (
              <div key={it.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.payout_batches?.period_label || "—"}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      {it.amount} {it.currency} · {it.transaction_reference || "No reference yet"}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize", color: it.status === "paid" ? "#1e8449" : it.status === "failed" ? "#c0392b" : "var(--gold-dark)" }}>
                    {it.status}
                  </span>
                </div>
                <button
                  onClick={() => downloadStatement(it)}
                  disabled={downloadingId === it.id}
                  style={{ marginTop: "0.75rem", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  {downloadingId === it.id ? "Generating..." : "Download Statement (PDF)"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}