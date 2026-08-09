import { NextRequest, NextResponse } from "next/server";
import { verifyAndRecordPayment } from "@/lib/payments/verify-and-record";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("verif-hash");
  if (!signature || signature !== process.env.FLUTTERWAVE_WEBHOOK_HASH) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = await req.json();
  if (event.status === "successful" || event.event === "charge.completed") {
    const reference = event.data?.tx_ref || event.txRef;
    if (reference) {
      await verifyAndRecordPayment("flutterwave", reference);
    }
  }

  return NextResponse.json({ received: true });
}