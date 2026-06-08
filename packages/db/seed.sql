-- BRIDGE MVP — Seed Data
-- Idempotent: safe to re-run on existing data. Never deletes rows that have FK references.
-- Run after schema.sql (and any migrations).

-- ── Business: Glow Studio Bangkok ────────────────────────────────────────────
insert into businesses (
  id, slug, name, category, location, description, cover_photo_url,
  photos, opening_hours, contact_phone, contact_whatsapp, contact_line,
  rating, review_count
)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'glowstudio',
  'Glow Studio Bangkok',
  'Beauty & Wellness',
  'Sukhumvit Soi 24, Bangkok',
  'Bangkok''s premier glow destination. Specialist facials and skin treatments by certified aestheticians.',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
  '[
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800",
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800"
  ]'::jsonb,
  '{
    "mon":"10:00-20:00",
    "tue":"10:00-20:00",
    "wed":"10:00-20:00",
    "thu":"10:00-20:00",
    "fri":"10:00-21:00",
    "sat":"09:00-21:00",
    "sun":"10:00-19:00"
  }'::jsonb,
  '+66 2 123 4567',
  '+66891234567',
  '@glowstudiobkk',
  4.9,
  127
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category = excluded.category,
  location = excluded.location,
  description = excluded.description,
  cover_photo_url = excluded.cover_photo_url,
  photos = excluded.photos,
  opening_hours = excluded.opening_hours,
  contact_phone = excluded.contact_phone,
  contact_whatsapp = excluded.contact_whatsapp,
  contact_line = excluded.contact_line,
  rating = excluded.rating,
  review_count = excluded.review_count;

-- ── Services ────────────────────────────────────────────────────────────────
-- Update-or-insert by (business_id, name) without deleting rows that have FK references.
-- Step 1: update any existing rows with canonical values.
update services s set
  description = c.description,
  duration    = c.duration,
  price       = c.price,
  sort_order  = c.sort_order,
  is_active   = true
from (values
  ('Signature Glow Facial',     'Our hero treatment. Deep cleanse, extraction, customised serum, LED therapy. The full glow package.',                  60, 1800, 1),
  ('Deep Cleanse Facial',       'Thorough pore cleanse with steam, enzyme exfoliation, and calming mask. Perfect for congested skin.',                  45, 1200, 2),
  ('Hydra Boost Treatment',     'Intensive hydration therapy with hyaluronic acid infusion and barrier-repair mask. Dewy skin guaranteed.',             75, 2500, 3),
  ('Express Glow-Up',           'Quick-fix radiance boost. Brightening peel + vitamin C serum. Perfect before a night out.',                            30, 800,  4),
  ('LED Light Therapy Add-On',  'Red & near-infrared light therapy to boost collagen and calm inflammation. Add to any facial.',                       20, 500,  5)
) as c(name, description, duration, price, sort_order)
where s.business_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  and s.name = c.name;

-- Step 2: insert any missing services.
insert into services (business_id, name, description, duration, price, sort_order)
select
  'a1b2c3d4-0000-0000-0000-000000000001',
  c.name, c.description, c.duration, c.price, c.sort_order
from (values
  ('Signature Glow Facial',     'Our hero treatment. Deep cleanse, extraction, customised serum, LED therapy. The full glow package.',                  60, 1800, 1),
  ('Deep Cleanse Facial',       'Thorough pore cleanse with steam, enzyme exfoliation, and calming mask. Perfect for congested skin.',                  45, 1200, 2),
  ('Hydra Boost Treatment',     'Intensive hydration therapy with hyaluronic acid infusion and barrier-repair mask. Dewy skin guaranteed.',             75, 2500, 3),
  ('Express Glow-Up',           'Quick-fix radiance boost. Brightening peel + vitamin C serum. Perfect before a night out.',                            30, 800,  4),
  ('LED Light Therapy Add-On',  'Red & near-infrared light therapy to boost collagen and calm inflammation. Add to any facial.',                       20, 500,  5)
) as c(name, description, duration, price, sort_order)
where not exists (
  select 1 from services existing
  where existing.business_id = 'a1b2c3d4-0000-0000-0000-000000000001'
    and existing.name = c.name
);

-- Step 3: dedupe — keep one row per (business_id, name); only delete duplicates that have NO bookings.
-- This makes re-running idempotent without breaking referential integrity.
with keepers as (
  select distinct on (name) id
  from services
  where business_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  order by name, created_at asc, id asc
)
delete from services s
where s.business_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  and s.id not in (select id from keepers)
  and not exists (select 1 from bookings b where b.service_id = s.id);

-- ── Creator: @glowwithsara ────────────────────────────────────────────────────
insert into creators (id, slug, handle, display_name, bio, socials)
values (
  'b1b2c3d4-0000-0000-0000-000000000001',
  'glowwithsara',
  '@glowwithsara',
  'Sara Chen',
  'Bangkok beauty & wellness explorer. Finding the city''s best-kept glow-ups so you don''t have to.',
  '[
    {"platform":"tiktok","url":"https://www.tiktok.com/@glowwithsara"},
    {"platform":"instagram","url":"https://www.instagram.com/glowwithsara"}
  ]'::jsonb
)
on conflict (id) do update set
  slug = excluded.slug,
  handle = excluded.handle,
  display_name = excluded.display_name,
  bio = excluded.bio,
  socials = excluded.socials;

-- ── Link: Sara → Glow Studio (with featured service) ─────────────────────────
-- featured_service_id resolved at insert time by name lookup. Falls back to NULL
-- if the column doesn't exist yet (migration_005 hasn't been run).
insert into links (
  creator_id, business_id, short_code,
  content_url, platform, content_thumbnail_url, status,
  featured_service_id
)
values (
  'b1b2c3d4-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'glowwithsara/glowstudio',
  'https://www.tiktok.com/@glowwithsara/video/7298765432109876543',
  'tiktok',
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
  'active',
  (
    select id from services
    where business_id = 'a1b2c3d4-0000-0000-0000-000000000001'
      and name = 'Signature Glow Facial'
    order by created_at asc, id asc
    limit 1
  )
)
on conflict (creator_id, business_id) do update set
  short_code            = excluded.short_code,
  content_url           = excluded.content_url,
  platform              = excluded.platform,
  content_thumbnail_url = excluded.content_thumbnail_url,
  status                = excluded.status,
  featured_service_id   = excluded.featured_service_id;

-- Belt-and-braces: ensure featured_service_id is set even if the row already
-- existed before the column was added or before this seed featured anything.
update links
set featured_service_id = (
  select id from services
  where business_id = 'a1b2c3d4-0000-0000-0000-000000000001'
    and name = 'Signature Glow Facial'
  order by created_at asc, id asc
  limit 1
)
where short_code = 'glowwithsara/glowstudio'
  and featured_service_id is null;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ADDITIONAL BUSINESSES — richer discovery data (staging / demo)            ║
-- ║  Each carries a category-appropriate cover_photo_url + photos gallery      ║
-- ║  (verified Unsplash URLs). The app still falls back to a per-category      ║
-- ║  gradient for any business with a null cover.                              ║
-- ║  Categories use the exact strings the app maps to gradients (mappers.ts).  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Businesses ───────────────────────────────────────────────────────────────
insert into businesses (
  id, slug, name, category, location, description, cover_photo_url, photos,
  opening_hours, contact_phone, contact_whatsapp, contact_line,
  rating, review_count
)
values
  (
    'a1b2c3d4-0000-0000-0000-000000000002', 'lumierehair', 'Lumière Hair Atelier',
    'Hair & Barber', 'Thonglor Soi 13, Bangkok',
    'Tokyo-trained stylists, Korean colour techniques, and a quiet upstairs studio. Where Thonglor goes for a transformation.',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    '["https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800","https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800"]'::jsonb,
    '{"mon":"11:00-20:00","tue":"11:00-20:00","wed":"11:00-20:00","thu":"11:00-20:00","fri":"11:00-21:00","sat":"10:00-21:00","sun":"10:00-19:00"}'::jsonb,
    '+66 2 712 8800', '+66812340002', '@lumierehair', 4.8, 96
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000003', 'serenityspa', 'Serenity Spa & Massage',
    'Massage & Therapy', 'Asok, Sukhumvit 21, Bangkok',
    'A calm escape minutes from the BTS. Traditional Thai, aromatherapy, and deep-tissue work by licensed therapists.',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
    '["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800","https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800","https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800"]'::jsonb,
    '{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-23:00","sat":"10:00-23:00","sun":"10:00-22:00"}'::jsonb,
    '+66 2 258 9000', '+66812340003', '@serenityspabkk', 4.9, 214
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000004', 'polishednails', 'Polished Nail Lab',
    'Nail & Spa', 'Siam Square Soi 5, Bangkok',
    'Clean-girl manis, structured gel, and nail art that goes viral. Sterile tools, vegan polish, zero rush.',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    '["https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800","https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800"]'::jsonb,
    '{"mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"10:00-21:00","sat":"10:00-21:00","sun":"11:00-19:00"}'::jsonb,
    '+66 2 252 1100', '+66812340004', '@polishednaillab', 4.7, 152
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000005', 'vitalflowyoga', 'Vital Flow Yoga',
    'Fitness & Yoga', 'Ari, Phahonyothin Soi 7, Bangkok',
    'Small-group vinyasa, yin, and breathwork in a sunlit Ari shophouse. Beginners genuinely welcome.',
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
    '["https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800","https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800","https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800"]'::jsonb,
    '{"mon":"07:00-21:00","tue":"07:00-21:00","wed":"07:00-21:00","thu":"07:00-21:00","fri":"07:00-20:00","sat":"08:00-18:00","sun":"08:00-18:00"}'::jsonb,
    '+66 2 619 4400', '+66812340005', '@vitalflowyoga', 4.9, 88
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000006', 'derme', 'Dermè Skin Clinic',
    'Beauty & Wellness', 'Phrom Phong, Sukhumvit 39, Bangkok',
    'Doctor-led skin clinic. Medical facials, lasers, and injectables with results-first, no-pressure consults.',
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800',
    '["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800","https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800"]'::jsonb,
    '{"mon":"10:00-19:00","tue":"10:00-19:00","wed":"10:00-19:00","thu":"10:00-19:00","fri":"10:00-19:00","sat":"10:00-18:00","sun":"closed"}'::jsonb,
    '+66 2 662 7700', '+66812340006', '@dermeclinic', 4.8, 173
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000007', 'bloombrow', 'Bloom Brow & Lash Bar',
    'Makeup & Styling', 'Ekkamai Soi 10, Bangkok',
    'Brow lamination, lash lifts, and natural-look extensions. In and out in under an hour, glowing for weeks.',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
    '["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800","https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=800","https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800"]'::jsonb,
    '{"mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"10:00-20:00","sat":"09:00-20:00","sun":"10:00-18:00"}'::jsonb,
    '+66 2 391 6600', '+66812340007', '@bloombrowbar', 4.8, 119
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category = excluded.category,
  location = excluded.location,
  description = excluded.description,
  cover_photo_url = excluded.cover_photo_url,
  photos = excluded.photos,
  opening_hours = excluded.opening_hours,
  contact_phone = excluded.contact_phone,
  contact_whatsapp = excluded.contact_whatsapp,
  contact_line = excluded.contact_line,
  rating = excluded.rating,
  review_count = excluded.review_count;

-- ── Services (idempotent: insert only what's missing per business+name) ───────
insert into services (business_id, name, description, duration, price, sort_order)
select v.business_id, v.name, v.description, v.duration, v.price, v.sort_order
from (values
  -- Lumière Hair Atelier
  ('a1b2c3d4-0000-0000-0000-000000000002'::uuid, 'Cut & Blow Dry',            'Consultation, precision cut, and a styled finish. For all hair lengths.',                       60,  1200, 1),
  ('a1b2c3d4-0000-0000-0000-000000000002'::uuid, 'Korean Glaze Colour',       'Glossy, low-maintenance colour with a translucent shine. Includes toner.',                     150,  3800, 2),
  ('a1b2c3d4-0000-0000-0000-000000000002'::uuid, 'Keratin Smoothing',         'Frizz-free, salon-smooth hair for up to 3 months. Humidity-proof.',                            180,  4500, 3),
  ('a1b2c3d4-0000-0000-0000-000000000002'::uuid, 'Scalp & Hair Spa',          'Detox scalp treatment, steam, and a deep-conditioning mask.',                                   45,  1500, 4),
  -- Serenity Spa & Massage
  ('a1b2c3d4-0000-0000-0000-000000000003'::uuid, 'Traditional Thai Massage',  'Classic stretch-and-press Thai bodywork to release tension head to toe.',                       60,  1000, 1),
  ('a1b2c3d4-0000-0000-0000-000000000003'::uuid, 'Aromatherapy Oil Massage',  'Full-body massage with bespoke essential-oil blend. Deeply relaxing.',                          90,  1800, 2),
  ('a1b2c3d4-0000-0000-0000-000000000003'::uuid, 'Deep Tissue Massage',       'Firm, targeted pressure for knots and chronic tightness.',                                      60,  1400, 3),
  ('a1b2c3d4-0000-0000-0000-000000000003'::uuid, 'Foot Reflexology',          'Pressure-point foot and lower-leg therapy. The perfect city reset.',                            45,   800, 4),
  -- Polished Nail Lab
  ('a1b2c3d4-0000-0000-0000-000000000004'::uuid, 'Classic Gel Manicure',      'Shaping, cuticle care, and a long-wear gel colour of your choice.',                             60,   900, 1),
  ('a1b2c3d4-0000-0000-0000-000000000004'::uuid, 'Structured Gel Overlay',    'Strengthening builder-gel overlay on natural nails. Chip-proof for weeks.',                     90,  1500, 2),
  ('a1b2c3d4-0000-0000-0000-000000000004'::uuid, 'Spa Pedicure',              'Soak, scrub, callus care, and gel finish. Sandal-ready.',                                       75,  1200, 3),
  ('a1b2c3d4-0000-0000-0000-000000000004'::uuid, 'Nail Art Add-On',           'Custom hand-painted art or chrome, per two nails.',                                             20,   400, 4),
  -- Vital Flow Yoga
  ('a1b2c3d4-0000-0000-0000-000000000005'::uuid, 'Drop-In Vinyasa Class',     'A single 60-minute flow class. Mats and props provided.',                                       60,   550, 1),
  ('a1b2c3d4-0000-0000-0000-000000000005'::uuid, 'Yin & Restore',             'Slow, deep stretches and long holds to unwind the nervous system.',                             75,   650, 2),
  ('a1b2c3d4-0000-0000-0000-000000000005'::uuid, 'Private 1:1 Session',       'Tailored one-on-one practice with a senior teacher.',                                           60,  1800, 3),
  ('a1b2c3d4-0000-0000-0000-000000000005'::uuid, 'Breathwork Workshop',       'Guided pranayama and breath techniques for calm and focus.',                                    90,   900, 4),
  -- Dermè Skin Clinic
  ('a1b2c3d4-0000-0000-0000-000000000006'::uuid, 'Medical Glow Facial',       'Clinical-grade cleanse, exfoliation, and serum infusion. Doctor-supervised.',                   60,  2800, 1),
  ('a1b2c3d4-0000-0000-0000-000000000006'::uuid, 'Pico Laser Brightening',    'Targets pigmentation and dullness for clearer, even-toned skin.',                               45,  4500, 2),
  ('a1b2c3d4-0000-0000-0000-000000000006'::uuid, 'Hydrafacial Deluxe',        'Multi-step resurfacing, extraction, and hydration in one session.',                             75,  3500, 3),
  ('a1b2c3d4-0000-0000-0000-000000000006'::uuid, 'Acne Consult & Peel',       'Personalised consult plus a gentle medical peel for breakout-prone skin.',                      50,  2200, 4),
  -- Bloom Brow & Lash Bar
  ('a1b2c3d4-0000-0000-0000-000000000007'::uuid, 'Brow Lamination',           'Fluffy, brushed-up brows that stay set for weeks. Includes shape and tint.',                    60,  1300, 1),
  ('a1b2c3d4-0000-0000-0000-000000000007'::uuid, 'Lash Lift & Tint',          'Lifts and darkens natural lashes for an effortless, mascara-free look.',                        60,  1400, 2),
  ('a1b2c3d4-0000-0000-0000-000000000007'::uuid, 'Classic Lash Extensions',   'Natural one-to-one lash extensions, individually applied.',                                    90,  1900, 3),
  ('a1b2c3d4-0000-0000-0000-000000000007'::uuid, 'Brow Shape & Tint',         'Precision threading or waxing plus a custom tint.',                                             30,   700, 4)
) as v(business_id, name, description, duration, price, sort_order)
where not exists (
  select 1 from services s
  where s.business_id = v.business_id and s.name = v.name
);

-- ── Second creator: @maiwellness ───────────────────────────────────────────────
insert into creators (id, slug, handle, display_name, bio, socials)
values (
  'b1b2c3d4-0000-0000-0000-000000000002',
  'maiwellness',
  '@maiwellness',
  'Mai Tan',
  'Bangkok wellness & self-care. Massages, movement, and the little rituals that keep this city livable.',
  '[
    {"platform":"tiktok","url":"https://www.tiktok.com/@maiwellness"},
    {"platform":"instagram","url":"https://www.instagram.com/maiwellness"}
  ]'::jsonb
)
on conflict (id) do update set
  slug = excluded.slug,
  handle = excluded.handle,
  display_name = excluded.display_name,
  bio = excluded.bio,
  socials = excluded.socials;

-- ── Creator links (populate the discovery loop) ───────────────────────────────
-- Each links a creator to a business; featured_service_id resolved by name.
insert into links (
  creator_id, business_id, short_code,
  content_url, platform, status, featured_service_id
)
values
  -- Sara → Serenity Spa (featuring Aromatherapy Oil Massage)
  (
    'b1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000003',
    'glowwithsara/serenityspa',
    'https://www.tiktok.com/@glowwithsara/video/7298765432109800001', 'tiktok', 'active',
    (select id from services where business_id = 'a1b2c3d4-0000-0000-0000-000000000003'
       and name = 'Aromatherapy Oil Massage' order by created_at asc, id asc limit 1)
  ),
  -- Sara → Bloom Brow & Lash (featuring Brow Lamination)
  (
    'b1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000007',
    'glowwithsara/bloombrow',
    'https://www.instagram.com/p/Cglowwithsara0007', 'instagram', 'active',
    (select id from services where business_id = 'a1b2c3d4-0000-0000-0000-000000000007'
       and name = 'Brow Lamination' order by created_at asc, id asc limit 1)
  ),
  -- Mai → Lumière Hair (featuring Korean Glaze Colour)
  (
    'b1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000002',
    'maiwellness/lumierehair',
    'https://www.tiktok.com/@maiwellness/video/7298765432109800002', 'tiktok', 'active',
    (select id from services where business_id = 'a1b2c3d4-0000-0000-0000-000000000002'
       and name = 'Korean Glaze Colour' order by created_at asc, id asc limit 1)
  ),
  -- Mai → Vital Flow Yoga (featuring Drop-In Vinyasa Class)
  (
    'b1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000005',
    'maiwellness/vitalflowyoga',
    'https://www.tiktok.com/@maiwellness/video/7298765432109800003', 'tiktok', 'active',
    (select id from services where business_id = 'a1b2c3d4-0000-0000-0000-000000000005'
       and name = 'Drop-In Vinyasa Class' order by created_at asc, id asc limit 1)
  ),
  -- Mai → Polished Nail Lab (place-only feature)
  (
    'b1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000004',
    'maiwellness/polishednails',
    'https://www.instagram.com/p/Cmaiwellness0004', 'instagram', 'active',
    null
  )
on conflict (creator_id, business_id) do update set
  short_code            = excluded.short_code,
  content_url           = excluded.content_url,
  platform              = excluded.platform,
  status                = excluded.status,
  featured_service_id   = excluded.featured_service_id;

-- ── Connected videos (creator_content) for the active links ──────────────────
-- Live embeds: status 'active' + fetch_status 'ok' so they render on the shop
-- page and count as "connected videos" in the business dashboard.
-- Idempotent via bare ON CONFLICT DO NOTHING (covers both unique constraints:
-- url_hash and (business_id, provider, external_id)).
insert into creator_content (
  link_id, creator_id, business_id,
  provider, content_url, external_id, url_hash,
  media_kind, aspect_ratio, poster_source, poster_path,
  caption, author_name, fetch_status, status, sort_order
)
select l.id, l.creator_id, l.business_id,
       v.provider, v.content_url, v.external_id, v.url_hash,
       'video', 'vertical', 'og', v.poster_path,
       v.caption, v.author_name, 'ok', 'active', v.sort_order
from (values
  -- Sara → Glow Studio (2 videos)
  ('glowwithsara/glowstudio', 'tiktok',
   'https://www.tiktok.com/@glowwithsara/video/7298765432109876543', '7298765432109876543',
   'seed-cc-sara-glow-1',
   'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
   'The Signature Glow Facial that broke my FYP ✨', 'Sara Chen', 0),
  ('glowwithsara/glowstudio', 'tiktok',
   'https://www.tiktok.com/@glowwithsara/video/7298765432109876544', '7298765432109876544',
   'seed-cc-sara-glow-2',
   'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
   'Before & after: 3 weeks of LED therapy', 'Sara Chen', 1),
  -- Sara → Serenity Spa
  ('glowwithsara/serenityspa', 'tiktok',
   'https://www.tiktok.com/@glowwithsara/video/7298765432109800001', '7298765432109800001',
   'seed-cc-sara-serenity-1',
   'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
   'The aromatherapy massage I think about weekly', 'Sara Chen', 0),
  -- Mai → Lumière Hair
  ('maiwellness/lumierehair', 'tiktok',
   'https://www.tiktok.com/@maiwellness/video/7298765432109800002', '7298765432109800002',
   'seed-cc-mai-lumiere-1',
   'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
   'Korean glaze colour — zero regrets', 'Mai Tan', 0),
  -- Mai → Vital Flow Yoga
  ('maiwellness/vitalflowyoga', 'tiktok',
   'https://www.tiktok.com/@maiwellness/video/7298765432109800003', '7298765432109800003',
   'seed-cc-mai-yoga-1',
   'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400',
   'Sunrise vinyasa in an Ari shophouse', 'Mai Tan', 0)
) as v(short_code, provider, content_url, external_id, url_hash,
       poster_path, caption, author_name, sort_order)
join links l on l.short_code = v.short_code
on conflict do nothing;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PENDING CREATOR REQUESTS — Glow Studio (demo for the Creators tab)        ║
-- ║  Creators who posted a video about Glow Studio and requested a link.       ║
-- ║  status = 'pending' → they appear as requests in the business dashboard.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Requesting creators ───────────────────────────────────────────────────────
insert into creators (id, slug, handle, display_name, bio, socials)
values
  (
    'b1b2c3d4-0000-0000-0000-000000000003',
    'ninaglows',
    '@ninaglows',
    'Nina Patel',
    'Skincare-obsessed and chronically online. Honest reviews of Bangkok facials, one glow at a time.',
    '[
      {"platform":"instagram","url":"https://www.instagram.com/ninaglows"},
      {"platform":"tiktok","url":"https://www.tiktok.com/@ninaglows"}
    ]'::jsonb
  ),
  (
    'b1b2c3d4-0000-0000-0000-000000000004',
    'skinbyploy',
    '@skinbyploy',
    'Ploy Srisuk',
    'Bangkok skin diaries — facials, treatments, and what actually works for hot-and-humid skin.',
    '[
      {"platform":"tiktok","url":"https://www.tiktok.com/@skinbyploy"},
      {"platform":"instagram","url":"https://www.instagram.com/skinbyploy"}
    ]'::jsonb
  )
on conflict (id) do update set
  slug = excluded.slug,
  handle = excluded.handle,
  display_name = excluded.display_name,
  bio = excluded.bio,
  socials = excluded.socials;

-- ── Pending link requests → Glow Studio ──────────────────────────────────────
-- Insert-if-missing (NOT upsert): if the owner approves/declines a request in
-- the demo, re-running the seed must not flip it back to 'pending'.
insert into links (
  creator_id, business_id, short_code,
  content_url, platform, content_thumbnail_url, status, featured_service_id
)
select v.creator_id, v.business_id, v.short_code,
       v.content_url, v.platform, v.content_thumbnail_url, v.status,
       (select id from services
          where business_id = v.business_id and name = v.featured_service
          order by created_at asc, id asc limit 1)
from (values
  -- Mai (existing creator) → Glow Studio, featuring Hydra Boost Treatment
  (
    'b1b2c3d4-0000-0000-0000-000000000002'::uuid, 'a1b2c3d4-0000-0000-0000-000000000001'::uuid,
    'maiwellness/glowstudio',
    'https://www.tiktok.com/@maiwellness/video/7298765432109800010', 'tiktok',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    'pending', 'Hydra Boost Treatment'
  ),
  -- Nina → Glow Studio, featuring Signature Glow Facial
  (
    'b1b2c3d4-0000-0000-0000-000000000003'::uuid, 'a1b2c3d4-0000-0000-0000-000000000001'::uuid,
    'ninaglows/glowstudio',
    'https://www.instagram.com/reel/Cninaglows0001', 'instagram',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400',
    'pending', 'Signature Glow Facial'
  ),
  -- Ploy → Glow Studio, featuring Deep Cleanse Facial
  (
    'b1b2c3d4-0000-0000-0000-000000000004'::uuid, 'a1b2c3d4-0000-0000-0000-000000000001'::uuid,
    'skinbyploy/glowstudio',
    'https://www.tiktok.com/@skinbyploy/video/7298765432109800011', 'tiktok',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
    'pending', 'Deep Cleanse Facial'
  )
) as v(creator_id, business_id, short_code, content_url, platform,
       content_thumbnail_url, status, featured_service)
where not exists (
  select 1 from links l
  where l.creator_id = v.creator_id and l.business_id = v.business_id
);
