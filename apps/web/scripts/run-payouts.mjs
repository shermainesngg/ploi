// Creator payout run: collects paid, creator-attributed bookings that haven't
// been paid out yet, writes a payouts row + payout_line_items per creator, and
// (when the creator has a Stripe account) sends the Stripe transfer.
//
//   node apps/web/scripts/run-payouts.mjs --dry-run   # show the plan, write nothing
//   node apps/web/scripts/run-payouts.mjs             # record ledger + transfer
//
// Reads .env.local at the repo root — confirm it points at the right Supabase
// project (and Stripe mode) before a non-dry run. Idempotent: bookings already
// present in payout_line_items are never paid twice. Amounts are stored in
// minor units (satang for THB), matching Stripe transfer amounts.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const env = readFileSync(resolve(root, '.env.local'), 'utf8')
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()

const db = createClient(
  get('NEXT_PUBLIC_SUPABASE_URL'),
  get('SUPABASE_SERVICE_ROLE_KEY') ?? get('SUPABASE_SECRET_KEY'),
  { auth: { persistSession: false } },
)
const stripeKey = get('STRIPE_SECRET_KEY')

const die = (label, error) => {
  if (error) { console.error(`✗ ${label}:`, error.message ?? error); process.exit(1) }
}

async function stripeTransfer({ amount, destination, description }) {
  const res = await fetch('https://api.stripe.com/v1/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(amount),
      currency: 'thb',
      destination,
      description,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error?.message ?? `Stripe ${res.status}`)
  return body
}

// ── 1. Candidate bookings: paid, attributed, not yet in any payout ───────────
const { data: bookings, error: bErr } = await db
  .from('bookings')
  .select('id, booking_date, commission_rate, is_repeat, link_id, services(price), links(creator_id)')
  .not('link_id', 'is', null)
  .not('commission_rate', 'is', null)
  .eq('payment_status', 'paid')
  .in('status', ['confirmed', 'completed'])
die('fetch bookings', bErr)

const { data: paidLines, error: lErr } = await db
  .from('payout_line_items')
  .select('booking_id')
die('fetch existing line items', lErr)
const alreadyPaid = new Set((paidLines ?? []).map((l) => l.booking_id))

const one = (rel) => (Array.isArray(rel) ? rel[0] : rel)

const eligible = (bookings ?? [])
  .filter((b) => !alreadyPaid.has(b.id))
  .map((b) => ({
    bookingId: b.id,
    bookingDate: b.booking_date,
    creatorId: one(b.links)?.creator_id,
    isRepeat: b.is_repeat,
    // Commission in THB, then satang (minor units) for ledger + Stripe.
    amountMinor: Math.round((one(b.services)?.price ?? 0) * b.commission_rate) * 100,
  }))
  .filter((b) => b.creatorId && b.amountMinor > 0)

if (eligible.length === 0) {
  console.log('Nothing to pay out — every paid attributed booking is already in the ledger.')
  process.exit(0)
}

// ── 2. Group by creator ──────────────────────────────────────────────────────
const byCreator = new Map()
for (const e of eligible) {
  if (!byCreator.has(e.creatorId)) byCreator.set(e.creatorId, [])
  byCreator.get(e.creatorId).push(e)
}

const { data: creators, error: cErr } = await db
  .from('creators')
  .select('id, slug, display_name, stripe_account_id')
  .in('id', [...byCreator.keys()])
die('fetch creators', cErr)
const creatorById = new Map((creators ?? []).map((c) => [c.id, c]))

// ── 3. One payout per creator ────────────────────────────────────────────────
for (const [creatorId, lines] of byCreator) {
  const creator = creatorById.get(creatorId)
  const total = lines.reduce((s, l) => s + l.amountMinor, 0)
  const dates = lines.map((l) => l.bookingDate).sort()
  const label = creator?.slug ?? creatorId

  console.log(
    `\n${label}: ${lines.length} booking(s), ฿${(total / 100).toLocaleString()}` +
    (creator?.stripe_account_id ? ` → ${creator.stripe_account_id}` : ' → NO STRIPE ACCOUNT (will stay pending)'),
  )
  for (const l of lines) {
    console.log(`  · ${l.bookingDate}  ฿${(l.amountMinor / 100).toLocaleString()}${l.isRepeat ? '  (repeat 5%)' : '  (first 10%)'}`)
  }
  if (dryRun) continue

  const { data: payout, error: pErr } = await db
    .from('payouts')
    .insert({
      creator_id: creatorId,
      amount: total,
      currency: 'THB',
      period_start: dates[0],
      period_end: dates[dates.length - 1],
      status: 'pending',
      notes: creator?.stripe_account_id ? null : 'Creator has no Stripe account yet',
    })
    .select()
    .single()
  die(`insert payout for ${label}`, pErr)

  const { error: liErr } = await db.from('payout_line_items').insert(
    lines.map((l) => ({
      payout_id: payout.id,
      booking_id: l.bookingId,
      amount: l.amountMinor,
      is_repeat: l.isRepeat,
    })),
  )
  die(`insert line items for ${label}`, liErr)

  if (creator?.stripe_account_id && stripeKey) {
    try {
      const transfer = await stripeTransfer({
        amount: total,
        destination: creator.stripe_account_id,
        description: `PLOI creator payout ${payout.id}`,
      })
      const { error: uErr } = await db
        .from('payouts')
        .update({ status: 'paid', stripe_transfer_id: transfer.id, paid_at: new Date().toISOString() })
        .eq('id', payout.id)
      die(`mark payout paid for ${label}`, uErr)
      console.log(`  ✓ transferred (${transfer.id})`)
    } catch (err) {
      await db
        .from('payouts')
        .update({ status: 'failed', notes: String(err.message ?? err) })
        .eq('id', payout.id)
      console.error(`  ✗ transfer failed: ${err.message ?? err} (ledger row kept, status=failed)`)
    }
  } else {
    console.log('  → recorded as pending (no transfer attempted)')
  }
}

console.log(dryRun ? '\nDry run — nothing was written.' : '\nPayout run complete.')
