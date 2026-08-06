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

export default function PaymentPanel({
  projectId,
  expertId,
  projectStatus,
  onReleased,
}: {
  projectId: string;
  expertId: string | null;
  projectStatus: string;
  onReleased?: () => void;
}) {
  const supabase = createClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, status, expert_id, release_notes, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setPayments(data || []);
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

    setReleasingId(paymentId);
    const { error } = await supabase.rpc("release_project_payment", {
      p_project_id: projectId,
      p_release_notes: notes || null,
    });
    setReleasingId(null);

    if (error) {
      alert("Could not release payment: " + error.message);
      return;
    }

    setNotes("");
    loadPayments();
    onReleased?.();
  }

  const totalHeld = payments.filter((p) => p.status === "held").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReleased = payments.filter((p) => p.status === "released").reduce((sum, p) => sum + Number(p.amount), 0);
  const canRelease = projectStatus === "approved";

  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem" }}>Payments</div>

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
              {p.status === "held" && (
                <>
                  {!expertId && (
                    <p style={{ fontSize: "0.7rem", color: "#c0392b", marginBottom: "0.4rem" }}>Assign an expert before releasing payment.</p>
                  )}
                  {expertId && !canRelease && (
                    <p style={{ fontSize: "0.7rem", color: "#c0392b", marginBottom: "0.4rem" }}>
                      Client must approve the delivered work before payment can be released (current status: {projectStatus.replace("_", " ")}).
                    </p>
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
                    disabled={!expertId || !canRelease || releasingId === p.id}
                    style={{
                      width: "100%",
                      background: expertId && canRelease ? "var(--gold)" : "var(--border)",
                      color: "var(--ink)",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      cursor: expertId && canRelease ? "pointer" : "not-allowed",
                    }}
                  >
                    {releasingId === p.id ? "Releasing..." : "Release to Expert"}
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