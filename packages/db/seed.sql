-- BRIDGE MVP — Seed Data
-- Run after schema.sql (and any migrations)

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
  cover_photo_url = excluded.cover_photo_url,
  photos = excluded.photos,
  opening_hours = excluded.opening_hours,
  contact_phone = excluded.contact_phone,
  contact_whatsapp = excluded.contact_whatsapp,
  contact_line = excluded.contact_line;

-- ── Services ──────────────────────────────────────────────────────────────────
-- Wipe existing services for this business so re-running this file is idempotent.
delete from services where business_id = 'a1b2c3d4-0000-0000-0000-000000000001';

insert into services (business_id, name, description, duration, price, sort_order) values
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Signature Glow Facial',
  'Our hero treatment. Deep cleanse, extraction, customised serum, LED therapy. The full glow package.',
  60, 1800, 1
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Deep Cleanse Facial',
  'Thorough pore cleanse with steam, enzyme exfoliation, and calming mask. Perfect for congested skin.',
  45, 1200, 2
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Hydra Boost Treatment',
  'Intensive hydration therapy with hyaluronic acid infusion and barrier-repair mask. Dewy skin guaranteed.',
  75, 2500, 3
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Express Glow-Up',
  'Quick-fix radiance boost. Brightening peel + vitamin C serum. Perfect before a night out.',
  30, 800, 4
),
(
  'a1b2c3d4-0000-0000-0000-000000000001',
  'LED Light Therapy Add-On',
  'Red & near-infrared light therapy to boost collagen and calm inflammation. Add to any facial.',
  20, 500, 5
);

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
  socials = excluded.socials;

-- ── Link with content URL + active status ────────────────────────────────────
insert into links (creator_id, business_id, short_code, content_url, platform, content_thumbnail_url, status)
values (
  'b1b2c3d4-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'glowwithsara/glowstudio',
  'https://www.tiktok.com/@glowwithsara/video/7298765432109876543',
  'tiktok',
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
  'active'
)
on conflict (creator_id, business_id) do update set
  content_url = excluded.content_url,
  platform = excluded.platform,
  content_thumbnail_url = excluded.content_thumbnail_url,
  status = excluded.status;
