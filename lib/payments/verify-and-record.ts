import { createAdminClient } from "@/lib/supabase/admin";

export async function verifyAndRecordPayment(provider: "flutterwave" | "paystack", reference: string) {
  const supabase = createAdminClient();

  const match = reference.match(/^EDUX-(FLW|PSK)-([0-9a-fA-F-]{36})-/);
  const projectId = match?.[2];
  if (!projectId) {
    return { success: false, error: "Could not extract project ID from reference" };
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("transaction_reference", reference)
    .maybeSingle();
  if (existing) {
    return { success: true, alreadyRecorded: true };
  }

  const { data: project } = await supabase.from("projects").select("expert_id").eq("id", projectId).single();
  const { data: quotation } = await supabase
    .from("quotations")
    .select("amount, usd_to_ngn_rate")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!quotation) {
    return { success: false, error: "No approved quotation found for this project" };
  }

  let verified = false;
  let amountPaid = 0;
  let currency = "";

  if (provider === "flutterwave") {
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });
    const json = await res.json();
    if (json.status === "success" && json.data?.status === "successful") {
      verified = true;
      amountPaid = json.data.amount;
      currency = json.data.currency;
    }
  } else {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const json = await res.json();
    if (json.status === true && json.data?.status === "success") {
      verified = true;
      amountPaid = json.data.amount / 100;
      currency = json.data.currency;
    }
  }

  if (!verified) {
    return { success: false, error: "Payment could not be verified with provider" };
  }

  if (provider === "flutterwave") {
    if (currency !== "USD" || Math.round(amountPaid) < Math.round(quotation.amount)) {
      return { success: false, error: "Amount mismatch" };
    }
  } else {
    if (!quotation.usd_to_ngn_rate) {
      return { success: false, error: "No conversion rate locked for this quotation" };
    }
    const expectedNgn = quotation.amount * quotation.usd_to_ngn_rate;
    if (currency !== "NGN" || amountPaid < expectedNgn - 1) {
      return { success: false, error: "Amount mismatch" };
    }
  }

  await supabase.from("payments").insert({
    project_id: projectId,
    amount: quotation.amount,
    method: provider,
    status: "held",
    verification_status: "verified",
    transaction_reference: reference,
    expert_id: project?.expert_id ?? null,
    usd_to_ngn_rate: provider === "paystack" ? quotation.usd_to_ngn_rate : null,
    provider_response: { provider, currency, amountPaid },
  });

  return { success: true };
}