// Seed staff + bookings for the test account (Glow Studio Bangkok).
//
//   node scripts/seed-bookings-staff.mjs
//
// Idempotent: uses deterministic IDs and upserts, so re-running updates in place
// rather than duplicating. Reads the Supabase service-role key from .env.local —
// STAGING ONLY. Dates are anchored to TODAY so the dashboard always shows a mix
// of past (completed/no-show) and upcoming (confirmed/pending) bookings.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const BIZ = 'a1b2c3d4-0000-0000-0000-000000000001' // Glow Studio Bangkok (seed business)

// Date helpers — anchor everything to today so the data never goes stale.
const today = new Date()
const ymd = (offsetDays) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
const iso = (offsetDays) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

async function main() {
  console.log(`\nProject: ${url}\nSeeding staff + bookings for Glow Studio Bangkok…\n`)

  // ── Resolve services + the creator link by their stable business-scoped keys ──
  const { data: services, error: svcErr } = await db
    .from('services')
    .select('id, name')
    .eq('business_id', BIZ)
  if (svcErr) throw svcErr
  const svc = Object.fromEntries(services.map((s) => [s.name, s.id]))
  if (services.length === 0) {
    console.error('No services found — run packages/db/seed.sql first.')
    process.exit(1)
  }

  const { data: linkRow } = await db
    .from('links')
    .select('id')
    .eq('short_code', 'glowwithsara/glowstudio')
    .maybeSingle()
  const LINK_ID = linkRow?.id ?? null // attributed bookings reference this creator link

  // ── Staff (deterministic IDs → upsert) ──────────────────────────────────────
  const staff = [
    { id: 'd1b2c3d4-0000-0000-0000-000000000001', name: 'Mali Srisawat', role: 'Senior Aesthetician' },
    { id: 'd1b2c3d4-0000-0000-0000-000000000002', name: 'Nok Pongpraditkul', role: 'Aesthetician' },
    { id: 'd1b2c3d4-0000-0000-0000-000000000003', name: 'Ploy Thanakit', role: 'Therapist' },
  ]
  const { error: staffErr } = await db
    .from('staff')
    .upsert(
      staff.map((s) => ({ id: s.id, business_id: BIZ, name: s.name, role: s.role, is_active: true })),
      { onConflict: 'id' },
    )
  if (staffErr) throw staffErr
  console.log(`✓ ${staff.length} staff upserted`)

  // Weekly schedules: Tue–Sun 10:00–20:00 (Mon off), matching business hours.
  const schedules = []
  for (const s of staff) {
    for (let dow = 0; dow <= 6; dow++) {
      schedules.push({
        staff_id: s.id,
        day_of_week: dow,
        start_time: '10:00',
        end_time: '20:00',
        is_available: dow !== 1, // Monday off
      })
    }
  }
  const { error: schedErr } = await db
    .from('staff_schedules')
    .upsert(schedules, { onConflict: 'staff_id,day_of_week' })
  if (schedErr) throw schedErr
  console.log(`✓ ${schedules.length} staff_schedules upserted`)

  // Service assignments — everyone does facials; only seniors do the add-on/hydra.
  const serviceIds = Object.values(svc)
  const staffServices = []
  for (const s of staff) staffServices.push(...serviceIds.map((sid) => ({ staff_id: s.id, service_id: sid })))
  const { error: ssErr } = await db
    .from('staff_services')
    .upsert(staffServices, { onConflict: 'staff_id,service_id' })
  if (ssErr) throw ssErr
  console.log(`✓ ${staffServices.length} staff_services upserted`)

  // ── Bookings (deterministic IDs → upsert) ───────────────────────────────────
  // status ∈ pending|confirmed|declined|cancelled|completed|no_show (migration_004)
  const n = (i) => `b0000000-0000-0000-0000-${String(i).padStart(12, '0')}`
  const rows = [
    // Today — fills the agenda: an early completed, confirmed appointments, a walk-in, a pending request.
    { svc: 'Express Glow-Up',       staff: 2, day: 0, time: '10:30', status: 'completed', attr: false, pay: 'paid' },
    { svc: 'Signature Glow Facial', staff: 0, day: 0, time: '12:00', status: 'confirmed', attr: true,  pay: 'paid' },
    { svc: 'Deep Cleanse Facial',   staff: 1, day: 0, time: '14:00', status: 'confirmed', attr: false, pay: 'pending' },
    { svc: 'Hydra Boost Treatment', staff: 0, day: 0, time: '15:30', status: 'confirmed', attr: true,  pay: 'paid' },
    { svc: 'LED Light Therapy Add-On', staff: 2, day: 0, time: '17:00', status: 'pending', attr: false, pay: 'pending' },
    { svc: 'Express Glow-Up',       staff: 1, day: 0, time: '18:30', status: 'confirmed', attr: false, pay: 'paid', walkin: true },
    // Past — completed (paid). Mix of creator-attributed and direct.
    { svc: 'Signature Glow Facial', staff: 0, day: -11, time: '11:00', status: 'completed', attr: true,  pay: 'paid' },
    { svc: 'Deep Cleanse Facial',   staff: 1, day: -9,  time: '14:30', status: 'completed', attr: false, pay: 'paid' },
    { svc: 'Hydra Boost Treatment', staff: 0, day: -8,  time: '16:00', status: 'completed', attr: true,  pay: 'paid' },
    { svc: 'Express Glow-Up',       staff: 2, day: -6,  time: '18:00', status: 'completed', attr: false, pay: 'paid', walkin: true },
    { svc: 'Signature Glow Facial', staff: 1, day: -4,  time: '12:00', status: 'completed', attr: true,  pay: 'paid' },
    // Past — no-show + cancelled.
    { svc: 'Deep Cleanse Facial',   staff: 2, day: -7,  time: '15:00', status: 'no_show',   attr: false, pay: 'pending' },
    { svc: 'LED Light Therapy Add-On', staff: 0, day: -5, time: '13:30', status: 'cancelled', attr: true, pay: 'refunded' },
    // Upcoming — confirmed.
    { svc: 'Signature Glow Facial', staff: 0, day: 1,  time: '11:00', status: 'confirmed', attr: true,  pay: 'paid' },
    { svc: 'Hydra Boost Treatment', staff: 1, day: 1,  time: '15:30', status: 'confirmed', attr: false, pay: 'pending' },
    { svc: 'Deep Cleanse Facial',   staff: 2, day: 2,  time: '10:30', status: 'confirmed', attr: true,  pay: 'paid' },
    { svc: 'Express Glow-Up',       staff: 0, day: 4,  time: '17:00', status: 'confirmed', attr: false, pay: 'pending' },
    // Upcoming — pending requests + one declined.
    { svc: 'Signature Glow Facial', staff: 1, day: 3,  time: '14:00', status: 'pending',   attr: true,  pay: 'pending' },
    { svc: 'Hydra Boost Treatment', staff: 2, day: 5,  time: '16:30', status: 'pending',   attr: false, pay: 'pending' },
    { svc: 'LED Light Therapy Add-On', staff: 1, day: 2, time: '19:00', status: 'declined', attr: false, pay: 'pending' },
  ]

  const customers = [
    ['Aria Tan', '+6591112233', 'aria.tan@example.com'],
    ['Bryan Lim', '+6592223344', 'bryan.lim@example.com'],
    ['Chloe Wong', '+6593334455', 'chloe.wong@example.com'],
    ['Daniel Ng', '+6594445566', 'daniel.ng@example.com'],
    ['Elena Koh', '+6595556677', 'elena.koh@example.com'],
    ['Farah Aziz', '+6596667788', 'farah.aziz@example.com'],
    ['Gavin Teo', '+6597778899', 'gavin.teo@example.com'],
  ]

  const bookings = rows.map((r, i) => {
    const [name, phone, email] = customers[i % customers.length]
    const completed = r.status === 'completed'
    return {
      id: n(i + 1),
      business_id: BIZ,
      service_id: svc[r.svc],
      staff_id: staff[r.staff].id,
      link_id: r.attr ? LINK_ID : null,
      customer_name: name,
      customer_contact: phone, // legacy NOT NULL field
      customer_phone: phone,
      customer_email: email,
      booking_date: ymd(r.day),
      booking_time: r.time,
      status: r.status,
      payment_status: r.pay,
      is_walkin: r.walkin ?? false,
      completed_at: completed ? iso(r.day) : null,
      notes: r.walkin ? 'Walk-in' : null,
    }
  })

  const { error: bkErr } = await db.from('bookings').upsert(bookings, { onConflict: 'id' })
  if (bkErr) throw bkErr
  console.log(`✓ ${bookings.length} bookings upserted`)

  // ── Attribution events for creator-linked bookings (powers the dashboard) ────
  if (LINK_ID) {
    const attributed = bookings.filter((b) => b.link_id && ['completed', 'confirmed'].includes(b.status))
    // Clear prior seed events for these bookings, then re-insert (idempotent).
    await db.from('attribution_events').delete().in('booking_id', attributed.map((b) => b.id))
    const events = attributed.map((b) => ({
      link_id: LINK_ID,
      booking_id: b.id,
      event_type: 'booking_confirmed',
      metadata: { source: 'seed', service_id: b.service_id },
    }))
    if (events.length) {
      const { error: aeErr } = await db.from('attribution_events').insert(events)
      if (aeErr) throw aeErr
      console.log(`✓ ${events.length} attribution_events inserted`)
    }
  }

  console.log('\nDone. Open the business dashboard to see staff + bookings.\n')
}

main().catch((e) => {
  console.error('\nSeed failed:', e.message ?? e)
  process.exit(1)
})
