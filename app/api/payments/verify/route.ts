import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { provider, reference, projectId } = await req.json();

  if (!provider || !reference || !projectId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

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
    return NextResponse.json({ error: "No approved quotation found for this project" }, { status: 400 });
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
  } else if (provider === "paystack") {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const json = await res.json();
    if (json.status === true && json.data?.status === "success") {
      verified = true;
      amountPaid = json.data.amount / 100; // Paystack returns kobo
      currency = json.data.currency;
    }
  } else {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (!verified) {
    return NextResponse.json({ error: "Payment could not be verified" }, { status: 400 });
  }

  if (provider === "flutterwave") {
    if (currency !== "USD" || Math.round(amountPaid) < Math.round(quotation.amount)) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
  } else {
    if (!quotation.usd_to_ngn_rate) {
      return NextResponse.json({ error: "No conversion rate locked for this quotation" }, { status: 400 });
    }
    const expectedNgn = quotation.amount * quotation.usd_to_ngn_rate;
    if (currency !== "NGN" || amountPaid < expectedNgn - 1) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("transaction_reference", reference)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, alreadyRecorded: true });
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

  return NextResponse.json({ success: true });
}