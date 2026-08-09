import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyAndRecordPayment } from "@/lib/payments/verify-and-record";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(body).digest("hex");
  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  if (event.event === "charge.success") {
    await verifyAndRecordPayment("paystack", event.data.reference);
  }

  return NextResponse.json({ received: true });
}