-- BRIDGE MVP — Database Schema
-- Target: PostgreSQL (Supabase)
-- Run this in your Supabase SQL editor or via psql

-- ── Enable UUID extension ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Businesses ────────────────────────────────────────────────────────────────
create table if not exists businesses (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  name            text not null,
  category        text not null,
  location        text not null,
  description     text,
  cover_image     text,                  -- legacy URL, deprecated
  cover_photo_url text,                  -- URL to business cover photo
  photos          jsonb default '[]'::jsonb,  -- Array of photo URLs
  opening_hours   jsonb,                 -- {mon:"09:00-18:00", ..., sun:"closed"}
  contact_phone   text,
  contact_whatsapp text,
  contact_line    text,
  email           text,                  -- account contact email
  auth_user_id    uuid,                  -- Supabase Auth user.id
  stripe_account_id text,                -- Stripe Connect connected account
  rating          numeric(2,1) default 0,
  review_count    integer default 0,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ── Services ──────────────────────────────────────────────────────────────────
create table if not exists services (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references businesses(id) on delete cascade,
  name            text not null,
  description     text,
  duration        integer not null,      -- minutes
  price           integer not null,      -- THB (stored as integer, no decimals)
  is_active       boolean default true,
  sort_order      integer default 0,
  created_at      timestamptz default now()
);

-- ── Creators ──────────────────────────────────────────────────────────────────
create table if not exists creators (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  handle          text unique not null,  -- e.g. @glowwithsara
  display_name    text not null,
  bio             text,
  avatar_url      text,
  socials         jsonb default '[]'::jsonb,  -- [{platform,url}]
  email           text,
  auth_user_id    uuid,
  stripe_account_id text,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ── Links (creator → business trackable links) ────────────────────────────────
create table if not exists links (
  id                     uuid primary key default uuid_generate_v4(),
  creator_id             uuid not null references creators(id) on delete cascade,
  business_id            uuid not null references businesses(id) on delete cascade,
  short_code             text unique not null,  -- e.g. glowwithsara/glowstudio
  content_url            text,                  -- TikTok/Reel/post URL that drove the recommendation
  platform               text check (platform is null or platform in ('tiktok','instagram','youtube','x','other')),
  content_thumbnail_url  text,                  -- thumbnail of the content
  status                 text not null default 'pending'
                           check (status in ('pending','active','declined')),
  click_count            integer default 0,
  is_active              boolean default true,
  created_at             timestamptz default now(),
  unique (creator_id, business_id)
);

-- ── Bookings ──────────────────────────────────────────────────────────────────
create table if not exists bookings (
  id              uuid primary key default uuid_generate_v4(),
  service_id      uuid not null references services(id),
  business_id     uuid not null references businesses(id),
  link_id         uuid references links(id),    -- null if direct (no creator attribution)
  customer_name   text not null,
  customer_contact text not null,               -- phone or email (legacy field)
  customer_email  text,
  customer_phone  text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  payment_status  text default 'pending'
                    check (payment_status is null or payment_status in ('pending','paid','failed','refunded')),
  booking_date    date not null,
  booking_time    time not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  notes           text,
  created_at      timestamptz default now()
);

-- ── Attribution events ────────────────────────────────────────────────────────
-- Tracks every meaningful event in the creator → booking funnel
create table if not exists attribution_events (
  id              uuid primary key default uuid_generate_v4(),
  link_id         uuid not null references links(id),
  booking_id      uuid references bookings(id),
  event_type      text not null
                    check (event_type in ('click', 'booking_started', 'booking_confirmed')),
  metadata        jsonb,                        -- user agent, referrer, etc.
  created_at      timestamptz default now()
);

-- ── Consumers ─────────────────────────────────────────────────────────────────
create table if not exists consumers (
  id            uuid primary key default uuid_generate_v4(),
  auth_user_id  uuid unique,
  email         text unique,
  name          text,
  phone         text,
  created_at    timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_services_business_id on services(business_id);
create index if not exists idx_links_creator_id on links(creator_id);
create index if not exists idx_links_business_id on links(business_id);
create index if not exists idx_links_short_code on links(short_code);
create index if not exists idx_bookings_business_id on bookings(business_id);
create index if not exists idx_bookings_link_id on bookings(link_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_attribution_link_id on attribution_events(link_id);
create index if not exists idx_attribution_booking_id on attribution_events(booking_id);
