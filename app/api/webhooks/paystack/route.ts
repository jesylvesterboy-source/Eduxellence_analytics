import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyAndRecordPayment } from "@/lib/payments/verify-and-record";

function safeHexEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const expected = crypto.createHmac("sha512", secret).update(body).digest("hex");
  if (!safeHexEqual(signature, expected)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const result = await verifyAndRecordPayment("paystack", event.data.reference);
    if (!result.success) {
      console.error(`[paystack webhook] verification failed for ${event.data.reference}: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}