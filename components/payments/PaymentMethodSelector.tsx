"use client";

import { useState } from "react";

type ExistingPayment = { status: string; verification_status: string; transaction_reference: string | null } | null;

export default function PaymentMethodSelector({
  amountUsd,
  ngnRate,
  userEmail,
  bankReference,
  existingPayment,
  onSubmitPayment,
  projectId,
  milestoneId,
}: {
  amountUsd: number;
  ngnRate: number | null;
  userEmail: string;
  bankReference: string;
  existingPayment: ExistingPayment;
  onSubmitPayment: (method: "flutterwave" | "paystack" | "bank_transfer", bankCurrency: "USD" | "NGN" | null, reference: string, proofFile: File | null) => Promise<{ error?: string }>;
  projectId: string;
  milestoneId?: string | null;
}) {
  const [selectedOption, setSelectedOption] = useState<"flutterwave" | "paystack" | "bank_usd" | "bank_ngn" | null>(null);
  const [gatewayReference, setGatewayReference] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [showConfirmBanner, setShowConfirmBanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Already funded — read-only state, no re-payment possible
  if (existingPayment && existingPayment.status !== "pending" && existingPayment.status !== "rejected") {
    return (
      <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", textAlign: "center" }}>
        <strong>✓ Funded</strong>
        {existingPayment.transaction_reference && (
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.3rem" }}>Ref: {existingPayment.transaction_reference}</p>
        )}
      </div>
    );
  }

  // Awaiting verification — client already confirmed, nothing more to do
  if (existingPayment && existingPayment.verification_status === "pending" && existingPayment.status === "pending") {
    return (
      <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.25rem", textAlign: "center" }}>
        <strong>Payment Awaiting Verification</strong>
        <p style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>Our team is verifying your payment. You&apos;ll be notified once confirmed.</p>
      </div>
    );
  }

  const isRetry = existingPayment?.status === "rejected";

  function payWithFlutterwave() {
    const w = window as any;
    if (!w.FlutterwaveCheckout) {
      alert("Payment gateway still loading — try again in a moment.");
      return;
    }
    const ref = `EDUX-FLW-${Date.now()}`;
    w.FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: ref,
      amount: amountUsd,
      currency: "USD",
      payment_options: "card,ussd,banktransfer",
      customer: { email: userEmail },
      customizations: { title: "Eduxellence Analytics" },
      meta: {
        platform_key: "analytics",
        project_id: projectId,
        milestone_id: milestoneId ?? null,
        expected_amount: amountUsd,
        expected_currency: "USD",
      },
      callback: () => {
        setSelectedOption("flutterwave");
        setGatewayReference(ref);
        setShowConfirmBanner(true);
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
    if (!ngnRate) {
      alert("No conversion rate set. Contact Admin.");
      return;
    }
    const amountNgn = Math.round(amountUsd * ngnRate * 100);
    const ref = `EDUX-PSK-${Date.now()}`;
    const handler = w.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amountNgn,
      currency: "NGN",
      ref,
      metadata: {
        platform_key: "analytics",
        project_id: projectId,
        milestone_id: milestoneId ?? null,
        expected_amount: amountUsd,
        expected_currency: "NGN",
      },
      callback: () => {
        setSelectedOption("paystack");
        setGatewayReference(ref);
        setShowConfirmBanner(true);
      },
      onClose: () => {},
    });
    handler.openIframe();
  }

  function chooseBankTransfer(currency: "USD" | "NGN") {
    setSelectedOption(currency === "USD" ? "bank_usd" : "bank_ngn");
    setGatewayReference(null);
    setShowConfirmBanner(true);
  }

  async function confirm() {
    if (!selectedOption) return;
    setSubmitting(true);
    const method = selectedOption === "flutterwave" ? "flutterwave" : selectedOption === "paystack" ? "paystack" : "bank_transfer";
    const bankCurrency = selectedOption === "bank_usd" ? "USD" : selectedOption === "bank_ngn" ? "NGN" : null;
    const reference = gatewayReference || bankReference;

    const result = await onSubmitPayment(method, bankCurrency, reference, proofFile);
    setSubmitting(false);
    if (result.error) {
      alert("Could not submit: " + result.error);
      return;
    }
  }

  const optionLabels: Record<string, string> = {
    flutterwave: "Flutterwave",
    paystack: "Paystack",
    bank_usd: "Raenest USD Transfer",
    bank_ngn: "Raenest NGN Transfer",
  };

  return (
    <div>
      {isRetry && (
        <p style={{ fontSize: "0.8rem", color: "#c0392b", marginBottom: "0.75rem" }}>
          Previous payment was rejected. Please retry with the correct details.
        </p>
      )}

      <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.85rem" }}>Pay Online</div>
        <button onClick={payWithFlutterwave} style={{ width: "100%", background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.65rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginBottom: "0.5rem" }}>
          Pay ${amountUsd} with Flutterwave (USD)
        </button>
        <button
          onClick={payWithPaystack}
          disabled={!ngnRate}
          style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.65rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", cursor: ngnRate ? "pointer" : "not-allowed" }}
        >
          {ngnRate ? `Pay ₦${(amountUsd * ngnRate).toLocaleString()} with Paystack (NGN)` : "Paystack unavailable — no rate set"}
        </button>
      </div>

      <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.85rem" }}>Pay by Bank Transfer</div>
        <div style={{ background: "var(--cream-dark)", borderRadius: "8px", padding: "0.85rem", marginBottom: "0.75rem", fontSize: "0.78rem" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>USD Account (Raenest):</strong>
            <div style={{ marginTop: "0.2rem", lineHeight: 1.5 }}>
              Jeremiah Williams Sylvester · Regent Bank · 117120079290 · Checking · Routing 103913434
            </div>
          </div>
          <div><strong>Reference:</strong> <span style={{ fontFamily: "monospace" }}>{bankReference}</span></div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => chooseBankTransfer("USD")} style={{ flex: 1, background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
            I Transferred USD
          </button>
          <button onClick={() => chooseBankTransfer("NGN")} style={{ flex: 1, background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.5rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
            I Transferred NGN
          </button>
        </div>
      </div>

      {showConfirmBanner && (
        <div style={{ background: "#fff3cd", border: "2px solid var(--gold)", borderRadius: "10px", padding: "1.25rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.4rem", color: "var(--gold-dark)" }}>⚠️ Confirm your payment method</div>
          <p style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
            You selected: <strong>{selectedOption && optionLabels[selectedOption]}</strong>
          </p>
          {(selectedOption === "bank_usd" || selectedOption === "bank_ngn") && (
            <>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.3rem" }}>Upload Proof of Payment (optional)</label>
              <input type="file" onChange={(e) => setProofFile(e.target.files?.[0] || null)} style={{ width: "100%", marginBottom: "0.75rem", fontSize: "0.8rem" }} />
            </>
          )}
          <button
            onClick={confirm}
            disabled={submitting}
            style={{ width: "100%", background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Submitting..." : "Confirm — I Made This Payment"}
          </button>
        </div>
      )}
    </div>
  );
}