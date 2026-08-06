"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../../_components/back-home-bar";

export default function PaymentPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<{ title: string; payment_reference: string | null } | null>(null);
  const [quotation, setQuotation] = useState<{ amount: number } | null>(null);
  const [existingPayment, setExistingPayment] = useState<{ id: string; status: string; verification_status: string } | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: proj } = await supabase
      .from("projects")
      .select("title, payment_reference")
      .eq("id", projectId)
      .single();
    setProject(proj);

    const { data: quote } = await supabase
      .from("quotations")
      .select("amount")
      .eq("project_id", projectId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setQuotation(quote);

    const { data: payment } = await supabase
      .from("payments")
      .select("id, status, verification_status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingPayment(payment);
  }, [projectId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function submitBankTransferNotification() {
    if (!userId || !quotation) return;
    setSubmitting(true);

    let proofUrl: string | null = null;
    if (proofFile) {
      const filePath = `${projectId}/payment-proof-${Date.now()}-${proofFile.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, proofFile);
      if (!uploadError) {
        proofUrl = filePath;
      }
    }

    await supabase.from("payments").insert({
      project_id: projectId,
      amount: quotation.amount,
      method: "bank_transfer",
      status: "pending",
      verification_status: "pending",
      transaction_reference: project?.payment_reference,
      proof_of_payment_url: proofUrl,
    });

    setSubmitting(false);
    setSubmitted(true);
    loadData();
  }

  if (!project || !quotation) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
        Loading, or no approved quotation found for this project yet.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <BackHomeBar backHref={`/dashboard/client/${projectId}`} backLabel="Back to Project" />

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Complete Payment
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          {project.title} — Amount due: <strong style={{ color: "var(--ink)" }}>${quotation.amount}</strong>
        </p>

        {existingPayment && existingPayment.status !== "pending" ? (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong>Payment {existingPayment.status}.</strong>
          </div>
        ) : submitted || (existingPayment && existingPayment.verification_status === "pending") ? (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong>Payment notification received.</strong>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Our team is verifying your transfer. You&apos;ll be notified once confirmed.</p>
          </div>
        ) : (
          <>
            {/* Online payment — enabled once gateway keys are configured */}
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem", opacity: 0.6 }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Pay Online (Card / Transfer / USSD)</div>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                Instant confirmation via Flutterwave or Paystack. Coming online shortly.
              </p>
              <button disabled style={{ width: "100%", background: "var(--border)", color: "var(--muted)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: "not-allowed" }}>
                Pay Now (temporarily unavailable)
              </button>
            </div>

            {/* Bank transfer — fully functional */}
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Pay by Bank Transfer</div>

              <div style={{ background: "var(--cream-dark)", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                <div style={{ marginBottom: "0.5rem" }}><strong>USD Account (Raenest):</strong> [Add account details]</div>
                <div style={{ marginBottom: "0.5rem" }}><strong>NGN Account (Raenest):</strong> [Add account details]</div>
                <div>
                  <strong>Payment Reference:</strong>{" "}
                  <span style={{ background: "var(--gold-light)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontFamily: "monospace" }}>
                    {project.payment_reference || "Generating..."}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                Include the reference above in your transfer, then confirm below.
              </p>

              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Upload Proof of Payment (optional)
              </label>
              <input
                type="file"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                style={{ width: "100%", marginBottom: "1rem", fontSize: "0.85rem" }}
              />

              <button
                onClick={submitBankTransferNotification}
                disabled={submitting || !project.payment_reference}
                style={{
                  width: "100%",
                  background: "var(--gold)",
                  color: "var(--ink)",
                  border: "none",
                  padding: "0.85rem",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Submitting..." : "I Have Made Payment"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
