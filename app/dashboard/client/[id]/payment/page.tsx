"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../../_components/back-home-bar";

type PaymentOption = "flutterwave" | "paystack" | "bank_usd" | "bank_ngn";

export default function PaymentPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [project, setProject] = useState<{ title: string; payment_reference: string | null } | null>(null);
  const [quotation, setQuotation] = useState<{ amount: number; usd_to_ngn_rate: number | null } | null>(null);
  const [existingPayment, setExistingPayment] = useState<{ id: string; status: string; verification_status: string } | null>(null);
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null);
  const [gatewayReference, setGatewayReference] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [showConfirmBanner, setShowConfirmBanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  function payWithFlutterwave() {
    const w = window as any;
    if (!w.FlutterwaveCheckout) {
      alert("Payment gateway still loading — try again in a moment.");
      return;
    }
    const ref = `EDUX-FLW-${projectId}-${Date.now()}`;
    w.FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: ref,
      amount: quotation!.amount,
      currency: "USD",
      payment_options: "card,ussd,banktransfer",
      customer: { email: userEmail },
      customizations: { title: "Eduxellence Analytics", description: project?.title ?? "Project payment" },
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
    if (!quotation?.usd_to_ngn_rate) {
      alert("No conversion rate set for this quotation. Contact Admin.");
      return;
    }
    const amountNgn = Math.round(quotation.amount * quotation.usd_to_ngn_rate * 100);
    const ref = `EDUX-PSK-${projectId}-${Date.now()}`;
    const handler = w.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amountNgn,
      currency: "NGN",
      ref,
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

  async function confirmPayment() {
    if (!selectedOption || !userId || !quotation) return;
    setSubmitting(true);

    let proofUrl: string | null = null;
    if (proofFile) {
      const filePath = `${projectId}/payment-proof-${Date.now()}-${proofFile.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, proofFile);
      if (!uploadError) proofUrl = filePath;
    }

    const method = selectedOption === "flutterwave" ? "flutterwave" : selectedOption === "paystack" ? "paystack" : "bank_transfer";
    const bankCurrency = selectedOption === "bank_usd" ? "USD" : selectedOption === "bank_ngn" ? "NGN" : null;
    const reference = gatewayReference || project?.payment_reference || `EDUX-BANK-${projectId}-${Date.now()}`;

    await supabase.from("payments").insert({
      project_id: projectId,
      amount: quotation.amount,
      method,
      bank_currency: bankCurrency,
      status: "pending",
      verification_status: "pending",
      transaction_reference: reference,
      proof_of_payment_url: proofUrl,
      usd_to_ngn_rate: bankCurrency === "NGN" || method === "paystack" ? quotation.usd_to_ngn_rate : null,
    });

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    if (admins && admins.length > 0) {
      const methodLabel =
        selectedOption === "flutterwave" ? "Flutterwave" :
        selectedOption === "paystack" ? "Paystack" :
        selectedOption === "bank_usd" ? "Raenest USD Transfer" : "Raenest NGN Transfer";
      await supabase.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.id,
          title: "Payment Confirmation Needed",
          body: `Client confirmed a payment via ${methodLabel} for "${project?.title ?? "a project"}". Please verify.`,
          link: `/dashboard/admin/payments`,
        }))
      );
    }

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

  const optionLabels: Record<PaymentOption, string> = {
    flutterwave: "Flutterwave",
    paystack: "Paystack",
    bank_usd: "Raenest USD Transfer",
    bank_ngn: "Raenest NGN Transfer",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="afterInteractive" />
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <BackHomeBar backHref={`/dashboard/client/${projectId}`} backLabel="Back to Project" />

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>
          Complete Payment
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          {project.title} — Amount due: <strong style={{ color: "var(--ink)" }}>${quotation.amount}</strong>
        </p>
        {quotation.usd_to_ngn_rate && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
            ≈ ₦{(quotation.amount * quotation.usd_to_ngn_rate).toLocaleString()} at Eduxellence&apos;s platform conversion rate of ₦{quotation.usd_to_ngn_rate} = $1 (for payment purposes only — not the official market exchange rate)
          </p>
        )}

        {existingPayment && existingPayment.status !== "pending" ? (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong>Payment {existingPayment.status}.</strong>
          </div>
        ) : submitted || (existingPayment && existingPayment.verification_status === "pending") ? (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
            <strong>Payment confirmation received.</strong>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Our team is verifying your payment. You&apos;ll be notified once confirmed.</p>
          </div>
        ) : (
          <>
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Pay Online</div>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.9rem" }}>
                Card, bank transfer, or USSD via a secure payment gateway.
              </p>
              <button onClick={payWithFlutterwave} style={{ width: "100%", background: "var(--gold)", color: "var(--ink)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: "pointer", marginBottom: "0.6rem" }}>
                Pay ${quotation.amount} with Flutterwave (USD)
              </button>
              <button
                onClick={payWithPaystack}
                disabled={!quotation.usd_to_ngn_rate}
                style={{ width: "100%", background: "var(--ink)", color: "var(--white)", border: "none", padding: "0.75rem", borderRadius: "6px", fontWeight: 600, cursor: quotation.usd_to_ngn_rate ? "pointer" : "not-allowed" }}
              >
                {quotation.usd_to_ngn_rate ? `Pay ₦${(quotation.amount * quotation.usd_to_ngn_rate).toLocaleString()} with Paystack (NGN)` : "Paystack unavailable — no rate set"}
              </button>
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem" }}>
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
                  <strong>NGN Account (Raenest):</strong> <em style={{ color: "var(--muted)" }}>Contact Admin for details</em>
                </div>
                <div>
                  <strong>Payment Reference:</strong>{" "}
                  <span style={{ background: "var(--gold-light)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontFamily: "monospace" }}>
                    {project.payment_reference || "Generating..."}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.9rem" }}>
                Include the reference above in your transfer, then tell us which account you sent to below.
              </p>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => chooseBankTransfer("USD")} style={{ flex: 1, background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.6rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                  I Transferred to USD Account
                </button>
                <button onClick={() => chooseBankTransfer("NGN")} style={{ flex: 1, background: "var(--cream-dark)", border: "1px solid var(--border)", padding: "0.6rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                  I Transferred to NGN Account
                </button>
              </div>
            </div>

            {showConfirmBanner && (
              <div style={{ background: "#fff3cd", border: "2px solid var(--gold)", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(200,150,12,0.25)" }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem", color: "var(--gold-dark)" }}>
                  ⚠️ Please confirm your payment method
                </div>
                <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                  Select the method you actually used to pay — this tells our team where to look to verify your payment.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}>
                  {(Object.keys(optionLabels) as PaymentOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedOption(opt)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: selectedOption === opt ? "2px solid var(--gold)" : "1px solid var(--border)",
                        background: selectedOption === opt ? "var(--gold-light)" : "var(--white)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {optionLabels[opt]}
                    </button>
                  ))}
                </div>

                {(selectedOption === "bank_usd" || selectedOption === "bank_ngn") && (
                  <>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                      Upload Proof of Payment (optional but recommended)
                    </label>
                    <input type="file" onChange={(e) => setProofFile(e.target.files?.[0] || null)} style={{ width: "100%", marginBottom: "1rem", fontSize: "0.85rem" }} />
                  </>
                )}

                <button
                  onClick={confirmPayment}
                  disabled={!selectedOption || submitting}
                  style={{
                    width: "100%",
                    background: selectedOption ? "var(--gold)" : "var(--border)",
                    color: "var(--ink)",
                    border: "none",
                    padding: "0.85rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                    cursor: selectedOption && !submitting ? "pointer" : "not-allowed",
                  }}
                >
                  {submitting ? "Submitting..." : "Confirm — I Made This Payment"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}