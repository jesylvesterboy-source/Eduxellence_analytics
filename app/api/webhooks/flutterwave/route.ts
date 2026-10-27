import { NextRequest, NextResponse } from "next/server";
import { verifyAndRecordPayment } from "@/lib/payments/verify-and-record";

function safeStringEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("verif-hash") || "";
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH || "";

  if (!safeStringEqual(signature, expected)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.status === "successful" || event.event === "charge.completed") {
    const reference = event.data?.tx_ref || event.txRef;
    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }
    const result = await verifyAndRecordPayment("flutterwave", reference);
    if (!result.success) {
      console.error(`[flutterwave webhook] verification failed for ${reference}: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}