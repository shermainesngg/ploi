-- ============================================================================
-- BRIDGE — Consolidated database setup (schema + migrations 001-007)
-- Generated from schema.sql + migration_001..007.
-- Run this ONCE in a fresh Supabase project's SQL editor, then run seed.sql.
-- Idempotent: safe to re-run.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ schema.sql
-- ╚══════════════════════════════════════════════════════════════════════════

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
  content_id      uuid,                         -- which video drove it (nullable); FK added after creator_content
  event_type      text not null
                    check (event_type in ('click', 'content_click', 'booking_started', 'booking_confirmed')),
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

-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ migration_001_link_activation.sql
-- ╚══════════════════════════════════════════════════════════════════════════

-- Migration 001: Link activation flow + creator socials + cover photos
-- Run this in your Supabase SQL editor on top of an existing schema.sql install.

-- ── businesses: cover photo ──────────────────────────────────────────────────
alter table businesses
  add column if not exists cover_photo_url text;

-- ── creators: socials JSONB ──────────────────────────────────────────────────
-- Format: [{"platform":"tiktok","url":"https://..."},{"platform":"instagram","url":"https://..."}]
alter table creators
  add column if not exists socials jsonb default '[]'::jsonb;

-- ── links: content URL, platform, status, thumbnail ──────────────────────────
alter table links
  add column if not exists content_url text;

alter table links
  add column if not exists platform text
  check (platform is null or platform in ('tiktok', 'instagram', 'youtube', 'x', 'other'));

alter table links
  add column if not exists content_thumbnail_url text;

-- Status: pending → active → declined
alter table links
  add column if not exists status text not null default 'pending';

-- Drop old check if it exists, re-add with full set
do $$ begin
  if exists (
    select 1 from pg_constraint where conname = 'links_status_check'
  ) then
    alter table links drop constraint links_status_check;
  end if;
end $$;

alter table links
  add constraint links_status_check
  check (status in ('pending', 'active', 'declined'));

-- Existing links default to active so they keep working
update links set status = 'active' where status = 'pending';

-- ── bookings: extend status to include 'declined' ────────────────────────────
do $$ begin
  if exists (
    select 1 from pg_constraint where conname = 'bookings_status_check'
  ) then
    alter table bookings drop constraint bookings_status_check;
  end if;
end $$;

alter table bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled'));

-- ── New indexes ──────────────────────────────────────────────────────────────
create index if not exists idx_links_status on links(status);
create index if not exists idx_links_business_status on links(business_id, status);

-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ migration_002_consumer_page.sql
-- ╚══════════════════════════════════════════════════════════════════════════

-- Migration 002: Consumer-facing Shop Booking Page enhancements
-- Adds business contact info, opening hours, and photo gallery.
-- Run in your Supabase SQL editor.

alter table businesses
  add column if not exists opening_hours jsonb,
  -- Format: { "mon":"09:00-18:00", "tue":"09:00-18:00", ..., "sun":"closed" }
  add column if not exists contact_phone text,
  add column if not exists contact_whatsapp text,
  add column if not exists contact_line text,
  add column if not exists photos jsonb default '[]'::jsonb;
  -- Format: ["https://...", "https://..."] — first photo is the cover

-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ migration_003_auth_payments.sql
-- ╚══════════════════════════════════════════════════════════════════════════

-- Migration 003: Auth (Supabase Auth linkage) + Stripe payments
-- Run after migration_002.

-- ── Auth + Stripe on creators ────────────────────────────────────────────────
alter table creators
  add column if not exists auth_user_id uuid,
  add column if not exists email text,
  add column if not exists stripe_account_id text;

create unique index if not exists idx_creators_auth_user on creators(auth_user_id) where auth_user_id is not null;
create unique index if not exists idx_creators_email on creators(email) where email is not null;

-- ── Auth + Stripe on businesses ──────────────────────────────────────────────
alter table businesses
  add column if not exists auth_user_id uuid,
  add column if not exists email text,
  add column if not exists stripe_account_id text;

create unique index if not exists idx_businesses_auth_user on businesses(auth_user_id) where auth_user_id is not null;
create unique index if not exists idx_businesses_email on businesses(email) where email is not null;

-- ── Bookings: structured contact + Stripe linkage ────────────────────────────
alter table bookings
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists payment_status text default 'pending'
    check (payment_status is null or payment_status in ('pending', 'paid', 'failed', 'refunded'));

create index if not exists idx_bookings_customer_email on bookings(customer_email);
create index if not exists idx_bookings_stripe_session on bookings(stripe_session_id);

-- ── Consumers table ──────────────────────────────────────────────────────────
create table if not exists consumers (
  id            uuid primary key default uuid_generate_v4(),
  auth_user_id  uuid unique,
  email         text unique,
  name          text,
  phone         text,
  created_at    timestamptz default now()
);

create index if not exists idx_consumers_email on consumers(email);

-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ migration_004_scheduling.sql
-- ╚══════════════════════════════════════════════════════════════════════════

-- Migration 004: Scheduling foundation
-- - Real availability based on business hours + bookings + blocks + buffer
-- - Staff schema (UI not yet built — schema ready for follow-up)
-- - Booking lifecycle: completed / no_show

-- ── Services: per-service buffer (cleanup time after appointment) ────────────
alter table services
  add column if not exists buffer_minutes integer default 0;

-- ── Bookings: extend status enum + completion timestamps ────────────────────
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'bookings_status_check') then
    alter table bookings drop constraint bookings_status_check;
  end if;
end $$;

alter table bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show'));

alter table bookings
  add column if not exists completed_at timestamptz,
  add column if not exists notes text,
  add column if not exists is_walkin boolean default false;

-- ── Time blocks (lunch breaks, holidays, blocked-out personal time) ─────────
create table if not exists time_blocks (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references businesses(id) on delete cascade,
  staff_id        uuid,                       -- nullable; null = blocks the whole business
  block_date      date,                        -- one-off block
  recurring_dow   integer,                     -- 0=Sun, 6=Sat. Null if one-off
  start_time      time not null,
  end_time        time not null,
  reason          text,
  created_at      timestamptz default now(),
  check (block_date is not null or recurring_dow is not null)
);

create index if not exists idx_time_blocks_business_date on time_blocks(business_id, block_date);
create index if not exists idx_time_blocks_business_dow on time_blocks(business_id, recurring_dow);

-- ── Staff (schema only — UI in follow-up) ───────────────────────────────────
create table if not exists staff (
  id            uuid primary key default uuid_generate_v4(),
  business_id   uuid not null references businesses(id) on delete cascade,
  name          text not null,
  role          text,
  photo_url     text,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create table if not exists staff_services (
  staff_id    uuid references staff(id) on delete cascade,
  service_id  uuid references services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table if not exists staff_schedules (
  id              uuid primary key default uuid_generate_v4(),
  staff_id        uuid not null references staff(id) on delete cascade,
  day_of_week     integer not null check (day_of_week between 0 and 6),  -- 0=Sun
  start_time      time not null,
  end_time        time not null,
  is_available    boolean default true,
  unique (staff_id, day_of_week)
);

alter table bookings
  add column if not exists staff_id uuid references staff(id);

create index if not exists idx_bookings_staff on bookings(staff_id);
create index if not exists idx_bookings_business_date on bookings(business_id, booking_date);

-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ migration_005_attribution.sql
-- ╚══════════════════════════════════════════════════════════════════════════

-- Migration 005: Content-first booking + repeat attribution
-- 1. Featured service per BRIDGE link
-- 2. Customer acquisition tracking + repeat-booking residual commission

-- ── Featured service on a link ──────────────────────────────────────────────
alter table links
  add column if not exists featured_service_id uuid references services(id);

create index if not exists idx_links_featured_service on links(featured_service_id);

-- Migration 006: multiple featured services per link (supersedes the single
-- featured_service_id above, which is retained for backward compatibility).
alter table links
  add column if not exists featured_service_ids uuid[] not null default '{}';

update links
set featured_service_ids = array[featured_service_id]
where featured_service_id is not null
  and (featured_service_ids is null or featured_service_ids = '{}');

create index if not exists idx_links_featured_services on links using gin (featured_service_ids);

-- ── Customer acquisitions ───────────────────────────────────────────────────
create table if not exists customer_acquisitions (
  id                uuid primary key default uuid_generate_v4(),
  customer_phone    text not null,                -- normalised: digits only, Thai 0XX → 66XX
  customer_email    text,
  customer_name     text,
  business_id       uuid not null references businesses(id) on delete cascade,
  creator_id        uuid not null references creators(id) on delete cascade,
  link_id           uuid references links(id),
  first_booking_id  uuid references bookings(id),
  acquired_at       timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '6 months'),
  is_active         boolean not null default true,
  unique (customer_phone, business_id)            -- one active acquisition per (phone, business)
);

create index if not exists idx_acq_phone_business on customer_acquisitions(customer_phone, business_id);
create index if not exists idx_acq_creator on customer_acquisitions(creator_id);
create index if not exists idx_acq_active on customer_acquisitions(is_active);

-- ── Bookings: attribution columns ────────────────────────────────────────────
alter table bookings
  add column if not exists acquisition_id   uuid references customer_acquisitions(id),
  add column if not exists is_repeat        boolean default false,
  add column if not exists commission_rate  numeric(4,3),
  add column if not exists content_id       uuid; -- which video drove it; FK added after creator_content
  -- 0.100 for first bookings, 0.050 for repeat. Nullable for non-attributed bookings.

create index if not exists idx_bookings_acquisition on bookings(acquisition_id);
create index if not exists idx_bookings_is_repeat on bookings(is_repeat);

-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ migration_006_pre_launch.sql
-- ╚══════════════════════════════════════════════════════════════════════════

-- Migration 006: Pre-launch hardening
-- 1. Payout ledger (creator earnings tracking)
-- 2. Currency support (multi-market: THB, SGD)
-- 3. Consumer identity (link consumers to bookings)
-- 4. updated_at timestamps
-- 5. Deprecate customer_contact legacy field
-- 6. Cancellation metadata
-- 7. Google Calendar prep
-- 8. Row Level Security policies


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. PAYOUT LEDGER
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists payouts (
  id                  uuid primary key default uuid_generate_v4(),
  creator_id          uuid not null references creators(id) on delete cascade,
  amount              integer not null,           -- total payout amount in currency minor units
  currency            text not null default 'THB',
  period_start        date not null,
  period_end          date not null,
  status              text not null default 'pending'
                        check (status in ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id  text,
  notes               text,
  created_at          timestamptz default now(),
  paid_at             timestamptz
);

create table if not exists payout_line_items (
  id          uuid primary key default uuid_generate_v4(),
  payout_id   uuid not null references payouts(id) on delete cascade,
  booking_id  uuid not null references bookings(id),
  amount      integer not null,                   -- commission earned on this booking
  is_repeat   boolean not null default false,
  created_at  timestamptz default now(),
  unique (payout_id, booking_id)
);

create index if not exists idx_payouts_creator on payouts(creator_id);
create index if not exists idx_payouts_status on payouts(status);
create index if not exists idx_payout_items_payout on payout_line_items(payout_id);
create index if not exists idx_payout_items_booking on payout_line_items(booking_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. CURRENCY SUPPORT
-- ══════════════════════════════════════════════════════════════════════════════

alter table services
  add column if not exists currency text not null default 'THB';

alter table bookings
  add column if not exists currency text not null default 'THB';

alter table businesses
  add column if not exists default_currency text not null default 'THB';


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. CONSUMER IDENTITY
-- ══════════════════════════════════════════════════════════════════════════════
-- Link the consumers table to bookings so logged-in customers can view their
-- booking history and the /bookings page has a reliable FK to query.

alter table bookings
  add column if not exists consumer_id uuid references consumers(id);

alter table customer_acquisitions
  add column if not exists consumer_id uuid references consumers(id);

create index if not exists idx_bookings_consumer on bookings(consumer_id);
create index if not exists idx_acq_consumer on customer_acquisitions(consumer_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. UPDATED_AT TIMESTAMPS
-- ══════════════════════════════════════════════════════════════════════════════

-- Supabase provides moddatetime extension for auto-updating timestamps.
create extension if not exists moddatetime schema extensions;

alter table bookings
  add column if not exists updated_at timestamptz default now();

alter table links
  add column if not exists updated_at timestamptz default now();

alter table businesses
  add column if not exists updated_at timestamptz default now();

alter table creators
  add column if not exists updated_at timestamptz default now();

alter table staff
  add column if not exists updated_at timestamptz default now();

-- Auto-update triggers
create or replace trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function extensions.moddatetime(updated_at);

create or replace trigger trg_links_updated_at
  before update on links
  for each row execute function extensions.moddatetime(updated_at);

create or replace trigger trg_businesses_updated_at
  before update on businesses
  for each row execute function extensions.moddatetime(updated_at);

create or replace trigger trg_creators_updated_at
  before update on creators
  for each row execute function extensions.moddatetime(updated_at);

create or replace trigger trg_staff_updated_at
  before update on staff
  for each row execute function extensions.moddatetime(updated_at);


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. DEPRECATE CUSTOMER_CONTACT
-- ══════════════════════════════════════════════════════════════════════════════
-- Make the legacy field nullable. Existing rows keep their data; new bookings
-- should populate customer_email and customer_phone instead.

alter table bookings
  alter column customer_contact drop not null;


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. CANCELLATION METADATA
-- ══════════════════════════════════════════════════════════════════════════════

alter table bookings
  add column if not exists cancelled_at     timestamptz,
  add column if not exists cancelled_by     text check (cancelled_by in ('customer', 'business', 'system')),
  add column if not exists cancel_reason    text;


-- ══════════════════════════════════════════════════════════════════════════════
-- 7. GOOGLE CALENDAR PREP
-- ══════════════════════════════════════════════════════════════════════════════

alter table businesses
  add column if not exists google_calendar_id       text,
  add column if not exists google_refresh_token     text,
  add column if not exists google_sync_token        text,
  add column if not exists google_last_synced_at    timestamptz,
  add column if not exists google_calendar_timezone text;

alter table bookings
  add column if not exists google_event_id    text,
  add column if not exists google_sync_status text
    check (google_sync_status in ('pending', 'synced', 'failed')),
  add column if not exists google_synced_at   timestamptz;

-- migration_016: business-proposed reschedule for pending bookings.
alter table bookings
  add column if not exists reschedule_proposed_date date,
  add column if not exists reschedule_proposed_time time,
  add column if not exists reschedule_proposed_at   timestamptz,
  add column if not exists reschedule_token         text;


-- ══════════════════════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════
-- Enable RLS on all tables. Policies use Supabase's auth.uid() to match
-- against auth_user_id columns. The service role key bypasses RLS, so
-- server-side admin queries remain unaffected.

-- ── Enable RLS ──────────────────────────────────────────────────────────────

alter table businesses enable row level security;
alter table services enable row level security;
alter table creators enable row level security;
alter table links enable row level security;
alter table bookings enable row level security;
alter table staff enable row level security;
alter table staff_services enable row level security;
alter table staff_schedules enable row level security;
alter table time_blocks enable row level security;
alter table consumers enable row level security;
alter table customer_acquisitions enable row level security;
alter table attribution_events enable row level security;
alter table payouts enable row level security;
alter table payout_line_items enable row level security;

-- ── Businesses: public read, owner write ────────────────────────────────────

create policy "businesses_public_read"
  on businesses for select
  using (true);

create policy "businesses_owner_update"
  on businesses for update
  using (auth.uid() = auth_user_id);

-- ── Services: public read, business owner write ─────────────────────────────

create policy "services_public_read"
  on services for select
  using (true);

create policy "services_owner_insert"
  on services for insert
  with check (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

create policy "services_owner_update"
  on services for update
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

create policy "services_owner_delete"
  on services for delete
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

-- ── Creators: public read, owner write ──────────────────────────────────────

create policy "creators_public_read"
  on creators for select
  using (true);

create policy "creators_owner_update"
  on creators for update
  using (auth.uid() = auth_user_id);

-- ── Links: public read active, creator insert, business owner update status ─

create policy "links_public_read"
  on links for select
  using (true);

create policy "links_creator_insert"
  on links for insert
  with check (
    creator_id in (select id from creators where auth_user_id = auth.uid())
  );

create policy "links_business_owner_update"
  on links for update
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

-- ── Bookings: business owner + consumer read their own ──────────────────────

create policy "bookings_business_read"
  on bookings for select
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

create policy "bookings_consumer_read"
  on bookings for select
  using (
    consumer_id in (select id from consumers where auth_user_id = auth.uid())
  );

create policy "bookings_consumer_insert"
  on bookings for insert
  with check (true);  -- anyone can create a booking (public booking page)

create policy "bookings_business_update"
  on bookings for update
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

-- ── Staff: business owner manages ───────────────────────────────────────────

create policy "staff_public_read"
  on staff for select
  using (true);

create policy "staff_owner_manage"
  on staff for all
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

create policy "staff_services_public_read"
  on staff_services for select
  using (true);

create policy "staff_services_owner_manage"
  on staff_services for all
  using (
    staff_id in (
      select s.id from staff s
      join businesses b on b.id = s.business_id
      where b.auth_user_id = auth.uid()
    )
  );

create policy "staff_schedules_public_read"
  on staff_schedules for select
  using (true);

create policy "staff_schedules_owner_manage"
  on staff_schedules for all
  using (
    staff_id in (
      select s.id from staff s
      join businesses b on b.id = s.business_id
      where b.auth_user_id = auth.uid()
    )
  );

-- ── Time blocks: business owner manages ─────────────────────────────────────

create policy "time_blocks_public_read"
  on time_blocks for select
  using (true);

create policy "time_blocks_owner_manage"
  on time_blocks for all
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

-- ── Consumers: own record only ──────────────────────────────────────────────

create policy "consumers_own_read"
  on consumers for select
  using (auth.uid() = auth_user_id);

create policy "consumers_own_update"
  on consumers for update
  using (auth.uid() = auth_user_id);

create policy "consumers_insert"
  on consumers for insert
  with check (auth.uid() = auth_user_id);

-- ── Customer acquisitions: business owner + creator read ────────────────────

create policy "acquisitions_business_read"
  on customer_acquisitions for select
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );

create policy "acquisitions_creator_read"
  on customer_acquisitions for select
  using (
    creator_id in (select id from creators where auth_user_id = auth.uid())
  );

-- ── Attribution events: business owner + creator read ───────────────────────

create policy "events_business_read"
  on attribution_events for select
  using (
    link_id in (
      select l.id from links l
      join businesses b on b.id = l.business_id
      where b.auth_user_id = auth.uid()
    )
  );

create policy "events_creator_read"
  on attribution_events for select
  using (
    link_id in (
      select l.id from links l
      join creators c on c.id = l.creator_id
      where c.auth_user_id = auth.uid()
    )
  );

-- ── Payouts: creator reads own ──────────────────────────────────────────────

create policy "payouts_creator_read"
  on payouts for select
  using (
    creator_id in (select id from creators where auth_user_id = auth.uid())
  );

create policy "payout_items_creator_read"
  on payout_line_items for select
  using (
    payout_id in (
      select p.id from payouts p
      join creators c on c.id = p.creator_id
      where c.auth_user_id = auth.uid()
    )
  );

-- ╔══════════════════════════════════════════════════════════════════════════
-- ║ migration_007_creator_content.sql
-- ╚══════════════════════════════════════════════════════════════════════════

-- Migration 007: creator_content — first-class 1:many content entity
-- Content moves off `links` (display-only fields stay) into a dedicated table that
-- powers the company-page content wall + async oEmbed/poster pipeline.
-- NOTE: numbered 007 because 006 is taken by migration_006_pre_launch.sql.
-- Keep links.content_url / platform / content_thumbnail_url — do NOT drop here.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists creator_content (
  id              uuid primary key default uuid_generate_v4(),

  -- relationships (link_id implies creator+business, but denormalize for indexing)
  link_id         uuid not null references links(id) on delete cascade,
  creator_id      uuid not null references creators(id) on delete cascade,
  business_id     uuid not null references businesses(id) on delete cascade,

  -- source identity
  provider        text not null
                    check (provider in ('tiktok','instagram','youtube','x','other')),
  content_url     text not null,
  external_id     text,                 -- numeric id (TikTok) | shortcode (IG/YouTube)
  url_hash        text not null,        -- sha256 of normalized URL; idempotency key

  -- media description
  media_kind      text not null default 'video'
                    check (media_kind in ('video','image','carousel')),
  aspect_ratio    text not null default 'vertical'
                    check (aspect_ratio in ('square','portrait','vertical','video')),

  -- poster
  poster_source   text                  -- 'oembed'|'predictable'|'og'|'upload'|'branded'
                    check (poster_source is null or poster_source in
                      ('oembed','predictable','og','upload','branded')),
  poster_path     text,                 -- HOST-AGNOSTIC key (not a full URL)
  caption         text,
  author_name     text,

  -- ingestion pipeline state — owned by the worker
  fetch_status    text not null default 'pending'
                    check (fetch_status in ('pending','fetching','ok','failed','unavailable')),
  attempts        integer not null default 0,
  last_attempt_at timestamptz,
  poster_expires_at timestamptz,

  -- moderation state — SEPARATE axis from fetch_status, owned by the business
  status          text not null default 'pending'
                    check (status in ('pending','active','hidden')),

  sort_order      integer not null default 0,
  click_count     integer not null default 0,   -- per-video tap counter (mirrors links.click_count)
  created_at      timestamptz default now()
);

-- Per-video attribution: wire attribution_events.content_id to creator_content now that
-- the table exists (the column is declared above; the FK is deferred to here).
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'attribution_events_content_id_fkey'
  ) then
    alter table attribution_events
      add constraint attribution_events_content_id_fkey
      foreign key (content_id) references creator_content(id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_content_id_fkey'
  ) then
    alter table bookings
      add constraint bookings_content_id_fkey
      foreign key (content_id) references creator_content(id);
  end if;
end $$;
create index if not exists idx_attribution_content_id on attribution_events(content_id);
create index if not exists idx_bookings_content_id on bookings(content_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Hot path: active content for a business, pre-sorted (partial composite kills the Sort node)
create index if not exists idx_creator_content_business_active
  on creator_content (business_id, sort_order) where status = 'active';

-- Creator profile page: a creator's active content
create index if not exists idx_creator_content_creator_active
  on creator_content (creator_id) where status = 'active';

-- Join/filter by link
create index if not exists idx_creator_content_link on creator_content (link_id);

-- Dedup guard: a creator can't attach the same video to a business twice
create unique index if not exists uq_creator_content_external
  on creator_content (business_id, provider, external_id);

-- Idempotency for the ingestion pipeline
create unique index if not exists uq_creator_content_url_hash on creator_content (url_hash);
