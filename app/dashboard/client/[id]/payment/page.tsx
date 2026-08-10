"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../../_components/back-home-bar";
import PaymentMethodSelector from "@/components/payments/PaymentMethodSelector";

export default function PaymentPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [project, setProject] = useState<{ title: string; payment_reference: string | null } | null>(null);
  const [quotation, setQuotation] = useState<{ amount: number; usd_to_ngn_rate: number | null } | null>(null);
  const [existingPayment, setExistingPayment] = useState<{ id: string; status: string; verification_status: string; transaction_reference: string | null } | null>(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: myProfile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
    setUserEmail(myProfile?.email || user.email || "");

    const { data: proj } = await supabase.from("projects").select("title, payment_reference").eq("id", projectId).single();
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
      .select("id, status, verification_status, transaction_reference")
      .eq("project_id", projectId)
      .is("milestone_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingPayment(payment);
  }, [projectId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmitPayment(method: "flutterwave" | "paystack" | "bank_transfer", bankCurrency: "USD" | "NGN" | null, reference: string, proofFile: File | null) {
    if (!userId || !quotation) return { error: "Not ready yet, try again." };

    let proofUrl: string | null = null;
    if (proofFile) {
      const filePath = `${projectId}/payment-proof-${Date.now()}-${proofFile.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, proofFile);
      if (!uploadError) proofUrl = filePath;
    }

    const { error } = await supabase.from("payments").insert({
      project_id: projectId,
      amount: quotation.amount,
      method,
      bank_currency: bankCurrency,
      status: "pending",
      verification_status: "pending",
      transaction_reference: reference,
      proof_of_payment_url: proofUrl,
      usd_to_ngn_rate: method === "paystack" || bankCurrency === "NGN" ? quotation.usd_to_ngn_rate : null,
    });

    if (error) return { error: error.message };

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    if (admins && admins.length > 0) {
      await supabase.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.id,
          title: "Payment Confirmation Needed",
          body: `Client confirmed a payment for "${project?.title ?? "a project"}". Please verify.`,
          link: `/dashboard/admin/payments`,
        }))
      );
    }

    loadData();
    return {};
  }

  if (!project || !quotation) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading, or no approved quotation found for this project yet.</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="afterInteractive" />
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <BackHomeBar backHref={`/dashboard/client/${projectId}`} backLabel="Back to Project" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", marginBottom: "0.5rem" }}>Complete Payment</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          {project.title} — Amount due: <strong style={{ color: "var(--ink)" }}>${quotation.amount}</strong>
        </p>

        <PaymentMethodSelector
          amountUsd={quotation.amount}
          ngnRate={quotation.usd_to_ngn_rate}
          userEmail={userEmail}
          bankReference={project.payment_reference || `EDUX-${projectId}`}
          existingPayment={existingPayment}
          onSubmitPayment={handleSubmitPayment}
        />
      </div>
    </div>
  );
}