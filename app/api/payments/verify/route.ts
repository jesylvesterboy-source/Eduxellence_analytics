import { NextRequest, NextResponse } from "next/server";
import { verifyAndRecordPayment } from "@/lib/payments/verify-and-record";

export async function POST(req: NextRequest) {
  const { provider, reference } = await req.json();
  if (!provider || !reference) {
    return NextResponse.json({ error: "Missing provider or reference" }, { status: 400 });
  }
  const result = await verifyAndRecordPayment(provider, reference);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}