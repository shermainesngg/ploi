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
