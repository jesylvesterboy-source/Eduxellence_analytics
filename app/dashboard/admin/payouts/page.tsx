"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type Batch = { id: string; period_label: string; cutoff_date: string; status: string; total_amount: number; currency: string };
type Item = { id: string; expert_id: string; amount: number; currency: string; status: string; transaction_reference: string | null; failure_reason: string | null; expert_name: string | null };

function mask(num: string) {
  return num.length > 4 ? "****" + num.slice(-4) : num;
}

export default function AdminPayoutsPage() {
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [periodLabel, setPeriodLabel] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setAdminId(user?.id ?? null);

    const { data } = await supabase.from("payout_batches").select("*").order("created_at", { ascending: false });
    setBatches(data || []);
  }, [supabase]);

  const loadItems = useCallback(
    async (batchId: string) => {
      const { data } = await supabase
        .from("payout_batch_items")
        .select("id, expert_id, amount, currency, status, transaction_reference, failure_reason, profiles!payout_batch_items_expert_id_fkey(full_name)")
        .eq("batch_id", batchId);
      setItems((data || []).map((r: any) => ({ ...r, expert_name: r.profiles?.full_name ?? null })));
    },
    [supabase]
  );

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (selectedBatch) loadItems(selectedBatch);
  }, [selectedBatch, loadItems]);

  async function generateBatch() {
    if (!periodLabel.trim() || !cutoffDate) {
      alert("Enter a period label and cutoff date.");
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.rpc("fn_generate_payout_batch", {
      p_period_label: periodLabel,
      p_cutoff_date: cutoffDate,
    });
    setGenerating(false);
    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    setPeriodLabel("");
    setCutoffDate("");
    loadBatches();
    if (data) setSelectedBatch(data);
  }

  async function approveBatch(batchId: string) {
    if (!adminId) return;
    if (!confirm("Approve this batch? Experts will be notified their payout is being processed.")) return;
    const { error } = await supabase.rpc("fn_approve_payout_batch", { p_batch_id: batchId, p_admin_id: adminId });
    if (error) { alert(error.message); return; }
    loadBatches();
  }

  async function markPaid(itemId: string) {
    const ref = prompt("Transaction reference:");
    if (!ref) return;
    setActingId(itemId);
    const { error } = await supabase.rpc("fn_mark_payout_item_paid", { p_item_id: itemId, p_reference: ref });
    setActingId(null);
    if (error) { alert(error.message); return; }
    if (selectedBatch) loadItems(selectedBatch);
  }

  async function markFailed(itemId: string) {
    const reason = prompt("Failure reason:");
    if (!reason) return;
    setActingId(itemId);
    const { error } = await supabase.rpc("fn_mark_payout_item_failed", { p_item_id: itemId, p_reason: reason });
    setActingId(null);
    if (error) { alert(error.message); return; }
    if (selectedBatch) loadItems(selectedBatch);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Admin Dashboard" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "1.5rem" }}>
          Expert Payouts
        </h1>

        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Generate New Payout Batch</div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input placeholder="Period label (e.g. Mid-August 2026)" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} style={{ flex: 1, padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }} />
            <input type="date" value={cutoffDate} onChange={(e) => setCutoffDate(e.target.value)} style={{ padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }} />
            <button onClick={generateBatch} disabled={generating} style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
              {generating ? "Generating..." : "Generate Batch"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {batches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatch(b.id)}
                style={{
                  textAlign: "left",
                  background: selectedBatch === b.id ? "var(--gold-light)" : "var(--white)",
                  border: selectedBatch === b.id ? "1px solid var(--gold)" : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{b.period_label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>${b.total_amount.toFixed(2)} · {b.status}</div>
              </button>
            ))}
          </div>

          <div>
            {!selectedBatch ? (
              <p style={{ color: "var(--muted)" }}>Select a batch to review.</p>
            ) : (
              <>
                {batches.find((b) => b.id === selectedBatch)?.status === "draft" && (
                  <button onClick={() => approveBatch(selectedBatch)} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.6rem 1.25rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", marginBottom: "1rem" }}>
                    Approve & Release Batch
                  </button>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {items.map((it) => (
                    <div key={it.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{it.expert_name || "Unknown"}</strong>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: it.status === "paid" ? "#1e8449" : it.status === "failed" ? "#c0392b" : "var(--gold-dark)" }}>{it.status}</span>
                      </div>
                      <div style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>{it.amount} {it.currency}</div>
                      {it.transaction_reference && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Ref: {it.transaction_reference}</div>}
                      {it.failure_reason && <div style={{ fontSize: "0.75rem", color: "#c0392b" }}>{it.failure_reason}</div>}
                      {it.status === "ready" && batches.find((b) => b.id === selectedBatch)?.status === "approved" && (
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                          <button onClick={() => markPaid(it.id)} disabled={actingId === it.id} style={{ background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.35rem 0.9rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Mark Paid</button>
                          <button onClick={() => markFailed(it.id)} disabled={actingId === it.id} style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b", padding: "0.35rem 0.9rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Mark Failed</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}