"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  transaction_reference: string | null;
  proof_of_payment_url: string | null;
  verification_status: string | null;
  created_at: string;
  project_id: string;
  projects: { title: string; client_id: string; expert_id: string | null } | null;
};

export default function AdminPaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [proofLinks, setProofLinks] = useState<Record<string, string>>({});

  const loadPayments = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, status, method, transaction_reference, proof_of_payment_url, verification_status, created_at, project_id, projects(title, client_id, expert_id)")
      .order("created_at", { ascending: false });

    const rows = (data || []) as unknown as PaymentRow[];
    setPayments(rows);

    const links: Record<string, string> = {};
    for (const p of rows) {
      if (p.proof_of_payment_url) {
        const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(p.proof_of_payment_url, 60 * 60);
        if (signed?.signedUrl) links[p.id] = signed.signedUrl;
      }
    }
    setProofLinks(links);
  }, [supabase]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  async function verifyPayment(id: string) {
    await supabase
      .from("payments")
      .update({ verification_status: "verified", status: "held" })
      .eq("id", id);
    loadPayments();
  }

  async function rejectPayment(id: string) {
    if (!confirm("Reject this payment notification?")) return;
    await supabase.from("payments").update({ verification_status: "rejected" }).eq("id", id);
    loadPayments();
  }

  async function releasePayment(id: string) {
    if (!confirm("Confirm release to expert?")) return;
    await supabase.from("payments").update({ status: "released", admin_released_at: new Date().toISOString() }).eq("id", id);
    loadPayments();
  }

  const totalHeld = payments.filter((p) => p.status === "held").reduce((s, p) => s + Number(p.amount), 0);
  const totalReleased = payments.filter((p) => p.status === "released").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.verification_status === "pending" && p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/admin" backLabel="Back to Dashboard" />

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", marginBottom: "1.5rem" }}>
          Payments
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <StatBox label="Pending Verification" value={`$${totalPending}`} />
          <StatBox label="Held" value={`$${totalHeld}`} />
          <StatBox label="Released" value={`$${totalReleased}`} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {payments.length === 0 && (
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
              No payments recorded yet.
            </div>
          )}
          {payments.map((p) => (
            <div key={p.id} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.projects?.title || "Unknown project"}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    ${p.amount} · {p.method || "unspecified"} · Ref: {p.transaction_reference || "—"}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    color: p.status === "released" ? "#1e8449" : p.status === "held" ? "var(--gold-dark)" : "var(--muted)",
                  }}
                >
                  {p.status}
                </span>
              </div>

              {p.method === "bank_transfer" && p.verification_status === "pending" && (
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.75rem" }}>
                  {proofLinks[p.id] && (
                    <a href={proofLinks[p.id]} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--gold-dark)", fontWeight: 600 }}>
                      View Proof
                    </a>
                  )}
                  <button onClick={() => verifyPayment(p.id)} style={smallBtn("var(--gold)", "var(--ink)")}>Verify Payment</button>
                  <button onClick={() => rejectPayment(p.id)} style={smallBtn("transparent", "#c0392b", true)}>Reject</button>
                </div>
              )}

              {p.status === "held" && (
                <button onClick={() => releasePayment(p.id)} disabled={!p.projects?.expert_id} style={smallBtn(p.projects?.expert_id ? "var(--ink)" : "var(--border)", "var(--white)")}>
                  Release to Expert
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--gold-dark)" }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}

function smallBtn(bg: string, color: string, outline = false): React.CSSProperties {
  return {
    background: bg,
    color,
    border: outline ? `1px solid ${color}` : "none",
    padding: "0.4rem 0.9rem",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
    marginTop: "0.5rem",
  };
}