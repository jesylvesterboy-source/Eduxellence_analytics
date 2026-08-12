// app/api/internal/payments/confirm/route.ts
//
// Called ONLY by the central payments service. Per your decision: a
// verified Paystack/Flutterwave webhook auto-confirms (status: 'held'),
// skipping the admin's manual "Verify Payment" click. Bank transfers are
// UNCHANGED — they never reach this endpoint (no gateway webhook exists
// for them), so they keep the existing manual review flow entirely.
//
// IMPORTANT — run this migration first, so this endpoint's idempotency
// is enforced by the database, not just application logic:
//
//   create unique index if not exists payments_transaction_reference_uidx
//     on public.payments (transaction_reference)
//     where transaction_reference is not null;
//
// Env var to add: ANALYTICS_CENTRAL_SHARED_SECRET
// Must exactly match platforms.shared_secret for the 'analytics' row in
// the central payments Supabase project.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const SHARED_SECRET = process.env.ANALYTICS_CENTRAL_SHARED_SECRET!

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !SHARED_SECRET) return false
  const computed = crypto.createHmac('sha256', SHARED_SECRET).update(rawBody).digest('hex')
  const a = Buffer.from(computed)
  const b = Buffer.from(signatureHeader)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

interface CentralPayload {
  event_type: 'payment' | 'refund' | 'chargeback'
  reference: string
  provider: 'paystack' | 'flutterwave'
  amount: number
  currency: string
  metadata: {
    project_id?: string
    milestone_id?: string | null
    platform_key?: string
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as CentralPayload
  const { event_type, reference, provider, amount, metadata } = payload

  if (!reference || !provider) {
    return NextResponse.json({ error: 'Missing reference or provider' }, { status: 400 })
  }

  const admin = serviceClient()

  // Refunds/chargebacks: releasing/clawing back a milestone payment
  // automatically is too risky to guess at (funds may already be
  // released to an expert). Flag for manual admin handling instead.
  if (event_type === 'refund' || event_type === 'chargeback') {
    console.warn(`[CENTRAL] ${event_type} received for reference=${reference} — needs manual review`)
    await admin.from('payments')
      .update({ notes: `${event_type}_flagged_needs_manual_review` })
      .eq('transaction_reference', reference)
    return NextResponse.json({ ok: true, note: `${event_type} logged for manual review` }, { status: 200 })
  }

  if (!metadata?.project_id) {
    return NextResponse.json({ error: 'Missing project_id in metadata' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // ── Try to update an existing row first (the common case: the client
  // already inserted a 'pending' row when the user clicked "Confirm").
  const { data: updated, error: updateErr } = await admin
    .from('payments')
    .update({
      verification_status: 'verified',
      status: 'held',
      verified_at: now,
      provider_response: payload,
    })
    .eq('transaction_reference', reference)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateErr) {
    console.error('Update failed:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  if (updated) {
    return NextResponse.json({ ok: true, id: updated.id, action: 'updated' })
  }

  // ── No pending row was updated. Either (a) the webhook arrived before
  // the client's own insert — a real race, given webhooks are typically
  // faster than a human clicking "Confirm" — or (b) this reference was
  // already processed (duplicate webhook). Distinguish the two: ──
  const { data: existing } = await admin
    .from('payments')
    .select('id, status')
    .eq('transaction_reference', reference)
    .maybeSingle()

  if (existing) {
    // Already held/released — duplicate webhook, safe no-op.
    return NextResponse.json({ ok: true, id: existing.id, action: 'already_processed' })
  }

  // Genuine race: insert the row ourselves. The unique index on
  // transaction_reference (see migration note above) is what actually
  // guarantees no double-insert if two retries land at the same instant —
  // a second concurrent insert will fail with 23505 and fall into the
  // catch below, which is treated as success (someone else won the race).
  const { data: inserted, error: insertErr } = await admin
    .from('payments')
    .insert({
      project_id: metadata.project_id,
      milestone_id: metadata.milestone_id ?? null,
      amount,
      method: provider,
      transaction_reference: reference,
      status: 'held',
      verification_status: 'verified',
      verified_at: now,
      provider_response: payload,
    })
    .select('id')
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ ok: true, action: 'already_processed_race' })
    }
    console.error('Insert failed:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: inserted.id, action: 'inserted' })
}