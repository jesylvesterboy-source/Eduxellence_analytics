"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../../_components/back-home-bar";

export default function PaymentPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [project, setProject] = useState<{ title: string; payment_reference: string | null } | null>(null);
  const [quotation, setQuotation] = useState<{ amount: number; usd_to_ngn_rate: number | null } | null>(null);
  const [existingPayment, setExistingPayment] = useState<{ id: string; status: string; verification_status: string } | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: myProfile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
    setUserEmail(myProfile?.email || user.email || "");

    const { data: proj } = await supabase
      .from("projects")
      .select("title, payment_reference")
      .eq("id", projectId)
      .single();
    setProject(proj);

    const { data: quote } = await supabase
      .from("quotations")
      .select("amount, usd_to_ngn_rate")
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
      usd_to_ngn_rate: quotation.usd_to_ngn_rate,
    });

    setSubmitting(false);
    setSubmitted(true);
    loadData();
  }

  function payWithFlutterwave() {
    const w = window as any;
    if (!w.FlutterwaveCheckout) {
      alert("Payment gateway still loading — try again in a moment.");
      return;
    }
    w.FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `EDUX-FLW-${projectId}-${Date.now()}`,
      amount: quotation!.amount,
      currency: "USD",
      payment_options: "card,ussd,banktransfer",
      customer: { email: userEmail },
      customizations: { title: "Eduxellence Analytics", description: project?.title ?? "Project payment" },
      callback: async (response: any) => {
        setVerifying(true);
        try {
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: "flutterwave", reference: response.transaction_id || response.tx_ref, projectId }),
          });
          const json = await res.json();
          if (json.success) {
            setSubmitted(true);
            loadData();
          } else {
            alert("Payment verification failed: " + (json.error || "unknown error"));
          }
        } catch (err: any) {
          console.error("Verification request failed:", err);
          alert("Could not reach the server to verify payment. Check your connection and try again, or contact support with reference: " + (response.transaction_id || response.tx_ref));
        } finally {
          setVerifying(false);
        }
      },
      onclose: () => {},
    });
  }

  function payWithPaystack() {
    const w = window as any;
    if (!w.PaystackPop) {
      alert("Payment gateway still loading — try again in a moment.");
      return;
    }
    if (!quotation?.usd_to_ngn_rate) {
      alert("No conversion rate set for this quotation. Contact Admin.");
      return;
    }
    const amountNgn = Math.round(quotation.amount * quotation.usd_to_ngn_rate * 100); // kobo
    const handler = w.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amountNgn,
      currency: "NGN",
      ref: `EDUX-PSK-${projectId}-${Date.now()}`,
      callback: (response: any) => {
        (async () => {
          setVerifying(true);
          try {
            const res = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider: "paystack", reference: response.reference, projectId }),
            });
            const json = await res.json();
            if (json.success) {
              setSubmitted(true);
              loadData();
            } else {
              alert("Payment verification failed: " + (json.error || "unknown error"));
            }
          } catch (err: any) {
            console.error("Verification request failed:", err);
            alert("Could not reach the server to verify payment. Check your connection and try again, or contact support with reference: " + response.reference);
          } finally {
            setVerifying(false);
          }
        })();
      },
      onClose: () => {},
    });
    handler.openIframe();
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
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="afterInteractive" />
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <BackHomeBar backHref={`/dashboard/client/${projectId}`} backLabel="Back to Project" />

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Complete Payment
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          {project.title} — Amount due: <strong style={{ color: "var(--ink)" }}>${quotation.amount}</strong>
        </p>

        {quotation.usd_to_ngn_rate && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem" }}>
            ≈ ₦{(quotation.amount * quotation.usd_to_ngn_rate).toLocaleString()} at Eduxellence&apos;s platform conversion rate of ₦{quotation.usd_to_ngn_rate} = $1 (for payment purposes only — not the official market exchange rate)
          </p>
        )}

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
            {/* Online payment — fully functional */}
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Pay Online</div>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.9rem" }}>
                Instant confirmation via card, bank transfer, or USSD.
              </p>
              <button
                onClick={payWithFlutterwave}
                disabled={verifying}
                style={{ width: "100%", background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: verifying ? "not-allowed" : "pointer", marginBottom: "0.6rem" }}
              >
                {verifying ? "Verifying..." : `Pay $${quotation.amount} with Flutterwave (USD)`}
              </button>
              <button
                onClick={payWithPaystack}
                disabled={verifying || !quotation.usd_to_ngn_rate}
                style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: verifying ? "not-allowed" : "pointer" }}
              >
                {verifying
                  ? "Verifying..."
                  : quotation.usd_to_ngn_rate
                  ? `Pay ₦${(quotation.amount * quotation.usd_to_ngn_rate).toLocaleString()} with Paystack (NGN)`
                  : "Paystack unavailable — no rate set"}
              </button>
            </div>

            {/* Bank transfer — fully functional */}
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Pay by Bank Transfer</div>

              <div style={{ background: "var(--cream-dark)", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong>USD Account (Raenest):</strong>
                  <div style={{ marginTop: "0.25rem", lineHeight: 1.6 }}>
                    Account Name: Jeremiah Williams Sylvester<br />
                    Bank: Regent Bank<br />
                    Account Number: 117120079290<br />
                    Account Type: Checking<br />
                    Routing Number: 103913434<br />
                    Bank Address: 7136 S. Yale Ave., Suite 100, Tulsa, OK 74136, USA
                  </div>
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>NGN Account (Raenest/Kredi Money Mfb Ltd):</strong>
                  <div style={{ marginTop: "0.25rem", lineHeight: 1.6 }}>
                    Account Name: Raenest/Jeremiah Williams Sylvester<br />
                    Account Number: 1842639663<br />
                    Bank: Kredi Money Mfb Ltd
                  </div>
                </div>
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