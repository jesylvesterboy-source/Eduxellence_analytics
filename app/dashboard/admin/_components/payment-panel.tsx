"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Payment = {
  id: string;
  amount: number;
  status: string;
  expert_id: string | null;
  release_notes: string | null;
  created_at: string;
};

type Earnings = {
  payment_id: string;
  expert_share_pct: number | null;
  expert_earnings: number;
  eduxellence_share: number;
  status: string;
};

export default function PaymentPanel({
  projectId,
  expertId,
  projectStatus,
  onReleased,
}: {
  projectId: string;
  expertId: string | null;
  projectStatus?: string;
  onReleased?: () => void;
}) {
  const supabase = createClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [earnings, setEarnings] = useState<Earnings[]>([]);

  const loadPayments = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, status, expert_id, release_notes, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setPayments(data || []);

    const { data: earningsData } = await supabase
      .from("expert_earnings")
      .select("payment_id, expert_share_pct, expert_earnings, eduxellence_share, status")
      .eq("project_id", projectId);
    setEarnings(earningsData || []);
  }, [projectId, supabase]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  async function recordPaymentHeld() {
    if (!amount) return;
    await supabase.from("payments").insert({
      project_id: projectId,
      amount: parseFloat(amount),
      status: "held",
      expert_id: expertId,
    });
    setAmount("");
    loadPayments();
  }

  async function releasePayment(paymentId: string) {
    if (!confirm("Confirm you have released this payment to the expert? This cannot be undone.")) return;
    await supabase
      .from("payments")
      .update({
        status: "released",
        admin_released_at: new Date().toISOString(),
        release_notes: notes || null,
      })
      .eq("id", paymentId);
    setNotes("");
    await supabase.from("projects").update({ status: "completed" }).eq("id", projectId);
    loadPayments();
    if (onReleased) onReleased();
  }

  const totalHeld = payments.filter((p) => p.status === "held").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReleased = payments.filter((p) => p.status === "released").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Payments</div>

      {projectStatus && (
        <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
          Project status: <strong style={{ textTransform: "capitalize" }}>{projectStatus.replace("_", " ")}</strong>
        </p>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", fontSize: "0.75rem" }}>
        <div style={{ flex: 1, background: "var(--cream-dark)", padding: "0.5rem", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontWeight: 700 }}>${totalHeld}</div>
          <div style={{ color: "var(--muted)" }}>Held</div>
        </div>
        <div style={{ flex: 1, background: "var(--cream-dark)", padding: "0.5rem", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontWeight: 700 }}>${totalReleased}</div>
          <div style={{ color: "var(--muted)" }}>Released</div>
        </div>
      </div>

      <input
        type="number"
        placeholder="Amount client paid (USD)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "0.5rem" }}
      />
      <button
        onClick={recordPaymentHeld}
        style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", marginBottom: "0.75rem" }}
      >
        Record Payment Received (Held)
      </button>

      {payments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {payments.map((p) => (
            <div key={p.id} style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <strong>${p.amount}</strong>
                <span style={{ textTransform: "capitalize", color: p.status === "released" ? "#1e8449" : "var(--gold-dark)" }}>{p.status}</span>
              </div>

              {(() => {
                const e = earnings.find((e) => e.payment_id === p.id);
                if (!e) return null;
                return (
                  <div style={{ background: "var(--cream-dark)", borderRadius: "6px", padding: "0.6rem", marginTop: "0.4rem", marginBottom: "0.4rem", fontSize: "0.75rem" }}>
                    <div>Expert share ({e.expert_share_pct ? Math.round(e.expert_share_pct * 100) : "fixed"}%): <strong>${e.expert_earnings.toFixed(2)}</strong> — <span style={{ textTransform: "capitalize" }}>{e.status}</span></div>
                    <div style={{ color: "var(--muted)" }}>Eduxellence share: ${e.eduxellence_share.toFixed(2)}</div>
                  </div>
                );
              })()}

              {p.status === "held" && (
                <>
                  {!expertId && (
                    <p style={{ fontSize: "0.7rem", color: "#c0392b", marginBottom: "0.4rem" }}>Assign an expert before releasing payment.</p>
                  )}
                  <input
                    type="text"
                    placeholder="Release note (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: "100%", padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "0.75rem", marginBottom: "0.4rem" }}
                  />
                  <button
                    onClick={() => releasePayment(p.id)}
                    disabled={!expertId}
                    style={{
                      width: "100%",
                      background: expertId ? "var(--gold)" : "var(--border)",
                      color: "var(--ink)",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      cursor: expertId ? "pointer" : "not-allowed",
                    }}
                  >
                    Release to Expert
                  </button>
                </>
              )}
              {p.status === "released" && p.release_notes && (
                <p style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Note: {p.release_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}