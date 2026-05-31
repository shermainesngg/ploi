-- Migration 005: Content-first booking + repeat attribution
-- 1. Featured service per BRIDGE link
-- 2. Customer acquisition tracking + repeat-booking residual commission

-- ── Featured service on a link ──────────────────────────────────────────────
alter table links
  add column if not exists featured_service_id uuid references services(id);

create index if not exists idx_links_featured_service on links(featured_service_id);

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
  add column if not exists commission_rate  numeric(4,3);
  -- 0.100 for first bookings, 0.050 for repeat. Nullable for non-attributed bookings.

create index if not exists idx_bookings_acquisition on bookings(acquisition_id);
create index if not exists idx_bookings_is_repeat on bookings(is_repeat);
