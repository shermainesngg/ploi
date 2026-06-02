// One-off staging seed: adds 6 businesses + services, a 2nd creator, and creator
// links — over the REST API (the direct Postgres host is IPv6-only / unreachable
// here). Idempotent: businesses/creators upsert by id, links upsert by
// (creator_id, business_id), services insert-if-missing (no unique constraint).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const env = readFileSync(resolve(root, '.env.local'), 'utf8')
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const db = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})

const die = (label, error) => {
  if (error) { console.error(`✗ ${label}:`, error.message ?? error); process.exit(1) }
}

const B = (n) => `a1b2c3d4-0000-0000-0000-00000000000${n}`
const SARA = 'b1b2c3d4-0000-0000-0000-000000000001'
const MAI = 'b1b2c3d4-0000-0000-0000-000000000002'

const businesses = [
  { id: B(2), slug: 'lumierehair', name: 'Lumière Hair Atelier', category: 'Hair & Barber',
    location: 'Thonglor Soi 13, Bangkok',
    description: 'Tokyo-trained stylists, Korean colour techniques, and a quiet upstairs studio. Where Thonglor goes for a transformation.',
    cover_photo_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    photos: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800'],
    opening_hours: { mon: '11:00-20:00', tue: '11:00-20:00', wed: '11:00-20:00', thu: '11:00-20:00', fri: '11:00-21:00', sat: '10:00-21:00', sun: '10:00-19:00' },
    contact_phone: '+66 2 712 8800', contact_whatsapp: '+66812340002', contact_line: '@lumierehair', rating: 4.8, review_count: 96 },
  { id: B(3), slug: 'serenityspa', name: 'Serenity Spa & Massage', category: 'Massage & Therapy',
    location: 'Asok, Sukhumvit 21, Bangkok',
    description: 'A calm escape minutes from the BTS. Traditional Thai, aromatherapy, and deep-tissue work by licensed therapists.',
    cover_photo_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
    photos: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800', 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800'],
    opening_hours: { mon: '10:00-22:00', tue: '10:00-22:00', wed: '10:00-22:00', thu: '10:00-22:00', fri: '10:00-23:00', sat: '10:00-23:00', sun: '10:00-22:00' },
    contact_phone: '+66 2 258 9000', contact_whatsapp: '+66812340003', contact_line: '@serenityspabkk', rating: 4.9, review_count: 214 },
  { id: B(4), slug: 'polishednails', name: 'Polished Nail Lab', category: 'Nail & Spa',
    location: 'Siam Square Soi 5, Bangkok',
    description: 'Clean-girl manis, structured gel, and nail art that goes viral. Sterile tools, vegan polish, zero rush.',
    cover_photo_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    photos: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800'],
    opening_hours: { mon: '10:00-20:00', tue: '10:00-20:00', wed: '10:00-20:00', thu: '10:00-20:00', fri: '10:00-21:00', sat: '10:00-21:00', sun: '11:00-19:00' },
    contact_phone: '+66 2 252 1100', contact_whatsapp: '+66812340004', contact_line: '@polishednaillab', rating: 4.7, review_count: 152 },
  { id: B(5), slug: 'vitalflowyoga', name: 'Vital Flow Yoga', category: 'Fitness & Yoga',
    location: 'Ari, Phahonyothin Soi 7, Bangkok',
    description: 'Small-group vinyasa, yin, and breathwork in a sunlit Ari shophouse. Beginners genuinely welcome.',
    cover_photo_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
    photos: ['https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800', 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800'],
    opening_hours: { mon: '07:00-21:00', tue: '07:00-21:00', wed: '07:00-21:00', thu: '07:00-21:00', fri: '07:00-20:00', sat: '08:00-18:00', sun: '08:00-18:00' },
    contact_phone: '+66 2 619 4400', contact_whatsapp: '+66812340005', contact_line: '@vitalflowyoga', rating: 4.9, review_count: 88 },
  { id: B(6), slug: 'derme', name: 'Dermè Skin Clinic', category: 'Beauty & Wellness',
    location: 'Phrom Phong, Sukhumvit 39, Bangkok',
    description: 'Doctor-led skin clinic. Medical facials, lasers, and injectables with results-first, no-pressure consults.',
    cover_photo_url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800',
    photos: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800'],
    opening_hours: { mon: '10:00-19:00', tue: '10:00-19:00', wed: '10:00-19:00', thu: '10:00-19:00', fri: '10:00-19:00', sat: '10:00-18:00', sun: 'closed' },
    contact_phone: '+66 2 662 7700', contact_whatsapp: '+66812340006', contact_line: '@dermeclinic', rating: 4.8, review_count: 173 },
  { id: B(7), slug: 'bloombrow', name: 'Bloom Brow & Lash Bar', category: 'Makeup & Styling',
    location: 'Ekkamai Soi 10, Bangkok',
    description: 'Brow lamination, lash lifts, and natural-look extensions. In and out in under an hour, glowing for weeks.',
    cover_photo_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
    photos: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800', 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=800', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'],
    opening_hours: { mon: '10:00-20:00', tue: '10:00-20:00', wed: '10:00-20:00', thu: '10:00-20:00', fri: '10:00-20:00', sat: '09:00-20:00', sun: '10:00-18:00' },
    contact_phone: '+66 2 391 6600', contact_whatsapp: '+66812340007', contact_line: '@bloombrowbar', rating: 4.8, review_count: 119 },
]

const services = [
  [B(2), 'Cut & Blow Dry', 'Consultation, precision cut, and a styled finish. For all hair lengths.', 60, 1200, 1],
  [B(2), 'Korean Glaze Colour', 'Glossy, low-maintenance colour with a translucent shine. Includes toner.', 150, 3800, 2],
  [B(2), 'Keratin Smoothing', 'Frizz-free, salon-smooth hair for up to 3 months. Humidity-proof.', 180, 4500, 3],
  [B(2), 'Scalp & Hair Spa', 'Detox scalp treatment, steam, and a deep-conditioning mask.', 45, 1500, 4],
  [B(3), 'Traditional Thai Massage', 'Classic stretch-and-press Thai bodywork to release tension head to toe.', 60, 1000, 1],
  [B(3), 'Aromatherapy Oil Massage', 'Full-body massage with bespoke essential-oil blend. Deeply relaxing.', 90, 1800, 2],
  [B(3), 'Deep Tissue Massage', 'Firm, targeted pressure for knots and chronic tightness.', 60, 1400, 3],
  [B(3), 'Foot Reflexology', 'Pressure-point foot and lower-leg therapy. The perfect city reset.', 45, 800, 4],
  [B(4), 'Classic Gel Manicure', 'Shaping, cuticle care, and a long-wear gel colour of your choice.', 60, 900, 1],
  [B(4), 'Structured Gel Overlay', 'Strengthening builder-gel overlay on natural nails. Chip-proof for weeks.', 90, 1500, 2],
  [B(4), 'Spa Pedicure', 'Soak, scrub, callus care, and gel finish. Sandal-ready.', 75, 1200, 3],
  [B(4), 'Nail Art Add-On', 'Custom hand-painted art or chrome, per two nails.', 20, 400, 4],
  [B(5), 'Drop-In Vinyasa Class', 'A single 60-minute flow class. Mats and props provided.', 60, 550, 1],
  [B(5), 'Yin & Restore', 'Slow, deep stretches and long holds to unwind the nervous system.', 75, 650, 2],
  [B(5), 'Private 1:1 Session', 'Tailored one-on-one practice with a senior teacher.', 60, 1800, 3],
  [B(5), 'Breathwork Workshop', 'Guided pranayama and breath techniques for calm and focus.', 90, 900, 4],
  [B(6), 'Medical Glow Facial', 'Clinical-grade cleanse, exfoliation, and serum infusion. Doctor-supervised.', 60, 2800, 1],
  [B(6), 'Pico Laser Brightening', 'Targets pigmentation and dullness for clearer, even-toned skin.', 45, 4500, 2],
  [B(6), 'Hydrafacial Deluxe', 'Multi-step resurfacing, extraction, and hydration in one session.', 75, 3500, 3],
  [B(6), 'Acne Consult & Peel', 'Personalised consult plus a gentle medical peel for breakout-prone skin.', 50, 2200, 4],
  [B(7), 'Brow Lamination', 'Fluffy, brushed-up brows that stay set for weeks. Includes shape and tint.', 60, 1300, 1],
  [B(7), 'Lash Lift & Tint', 'Lifts and darkens natural lashes for an effortless, mascara-free look.', 60, 1400, 2],
  [B(7), 'Classic Lash Extensions', 'Natural one-to-one lash extensions, individually applied.', 90, 1900, 3],
  [B(7), 'Brow Shape & Tint', 'Precision threading or waxing plus a custom tint.', 30, 700, 4],
].map(([business_id, name, description, duration, price, sort_order]) => ({ business_id, name, description, duration, price, sort_order }))

const creators = [
  { id: SARA, slug: 'glowwithsara', handle: '@glowwithsara', display_name: 'Sara Chen',
    bio: "Bangkok beauty & wellness explorer. Finding the city's best-kept glow-ups so you don't have to.",
    socials: [{ platform: 'tiktok', url: 'https://www.tiktok.com/@glowwithsara' }, { platform: 'instagram', url: 'https://www.instagram.com/glowwithsara' }] },
  { id: MAI, slug: 'maiwellness', handle: '@maiwellness', display_name: 'Mai Tan',
    bio: 'Bangkok wellness & self-care. Massages, movement, and the little rituals that keep this city livable.',
    socials: [{ platform: 'tiktok', url: 'https://www.tiktok.com/@maiwellness' }, { platform: 'instagram', url: 'https://www.instagram.com/maiwellness' }] },
]

const links = [
  { creator_id: SARA, business_id: B(3), short_code: 'glowwithsara/serenityspa', content_url: 'https://www.tiktok.com/@glowwithsara/video/7298765432109800001', platform: 'tiktok', status: 'active', feature: 'Aromatherapy Oil Massage' },
  { creator_id: SARA, business_id: B(7), short_code: 'glowwithsara/bloombrow', content_url: 'https://www.instagram.com/p/Cglowwithsara0007', platform: 'instagram', status: 'active', feature: 'Brow Lamination' },
  { creator_id: MAI, business_id: B(2), short_code: 'maiwellness/lumierehair', content_url: 'https://www.tiktok.com/@maiwellness/video/7298765432109800002', platform: 'tiktok', status: 'active', feature: 'Korean Glaze Colour' },
  { creator_id: MAI, business_id: B(5), short_code: 'maiwellness/vitalflowyoga', content_url: 'https://www.tiktok.com/@maiwellness/video/7298765432109800003', platform: 'tiktok', status: 'active', feature: 'Drop-In Vinyasa Class' },
  { creator_id: MAI, business_id: B(4), short_code: 'maiwellness/polishednails', content_url: 'https://www.instagram.com/p/Cmaiwellness0004', platform: 'instagram', status: 'active', feature: null },
]

// 0. Connectivity / auth check
{
  const { error } = await db.from('businesses').select('id', { count: 'exact', head: true })
  die('connect (select businesses)', error)
  console.log('✓ connected to', get('NEXT_PUBLIC_SUPABASE_URL'))
}

// 1. Businesses — upsert by id
{
  const { error } = await db.from('businesses').upsert(businesses, { onConflict: 'id' })
  die('upsert businesses', error)
  console.log(`✓ businesses upserted: ${businesses.length}`)
}

// 2. Services — insert only those missing (no unique constraint to upsert on)
{
  const bizIds = businesses.map((b) => b.id)
  const { data: existing, error } = await db.from('services').select('business_id, name').in('business_id', bizIds)
  die('select existing services', error)
  const seen = new Set((existing ?? []).map((s) => `${s.business_id}|${s.name}`))
  const missing = services.filter((s) => !seen.has(`${s.business_id}|${s.name}`))
  if (missing.length) {
    const { error: insErr } = await db.from('services').insert(missing)
    die('insert services', insErr)
  }
  console.log(`✓ services: ${missing.length} inserted, ${services.length - missing.length} already present`)
}

// 3. Creators — upsert by id
{
  const { error } = await db.from('creators').upsert(creators, { onConflict: 'id' })
  die('upsert creators', error)
  console.log(`✓ creators upserted: ${creators.length}`)
}

// 4. Links — resolve featured service ids, then upsert by (creator_id, business_id)
{
  const featuredBiz = [...new Set(links.filter((l) => l.feature).map((l) => l.business_id))]
  const { data: svc, error } = await db.from('services').select('id, business_id, name').in('business_id', featuredBiz)
  die('select services for featuring', error)
  const idFor = (business_id, name) => (svc ?? []).find((s) => s.business_id === business_id && s.name === name)?.id ?? null

  const rows = links.map(({ feature, ...l }) => ({
    ...l,
    featured_service_id: feature ? idFor(l.business_id, feature) : null,
  }))
  const unresolved = links.filter((l) => l.feature && !idFor(l.business_id, l.feature))
  if (unresolved.length) console.warn('  ! could not resolve featured service for:', unresolved.map((l) => l.short_code).join(', '))

  const { error: upErr } = await db.from('links').upsert(rows, { onConflict: 'creator_id,business_id' })
  die('upsert links', upErr)
  console.log(`✓ links upserted: ${rows.length}`)
}

// 5. Final tallies
{
  const counts = {}
  for (const t of ['businesses', 'services', 'creators', 'links']) {
    const { count } = await db.from(t).select('id', { count: 'exact', head: true })
    counts[t] = count
  }
  console.log('\nStaging totals →', counts)
  console.log('Done.')
}
