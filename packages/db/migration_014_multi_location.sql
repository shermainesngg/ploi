-- Migration 014: Multi-location businesses
-- A business can now have multiple locations (branches). Each location is a full
-- booking unit: its own address, opening hours, contacts, and (optional) photos.
-- Staff, bookings, and time_blocks gain a location_id so availability is computed
-- per branch. Services stay business-scoped (a shared menu across all locations).
--
-- Backfill: every existing business gets ONE primary location built from its
-- current single-location fields, and all its staff / bookings / time_blocks are
-- pointed at that primary location. The legacy businesses.location /
-- opening_hours / contact_* columns are kept (read-compat) and mirrored to the
-- primary location by the app layer — nothing breaks for single-branch
-- businesses.
-- Idempotent: safe to re-run.

-- ── Locations table ──────────────────────────────────────────────────────────
create table if not exists locations (
  id               uuid primary key default uuid_generate_v4(),
  business_id      uuid not null references businesses(id) on delete cascade,
  name             text,                       -- branch label, e.g. "Thonglor". Null = unnamed/main.
  address          text not null,
  opening_hours    jsonb,                      -- {mon:"09:00-18:00", ..., sun:"closed"}
  contact_phone    text,
  contact_whatsapp text,
  contact_line     text,
  photos           jsonb default '[]'::jsonb,  -- optional; empty falls back to business.photos
  is_primary       boolean not null default false,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_locations_business on locations(business_id);
-- At most one primary location per business.
create unique index if not exists uq_locations_primary
  on locations(business_id) where is_primary;

-- ── location_id on the booking-unit tables ───────────────────────────────────
alter table staff
  add column if not exists location_id uuid references locations(id);
alter table bookings
  add column if not exists location_id uuid references locations(id);
alter table time_blocks
  add column if not exists location_id uuid references locations(id);

create index if not exists idx_staff_location on staff(location_id);
create index if not exists idx_bookings_location on bookings(location_id);
create index if not exists idx_time_blocks_location on time_blocks(location_id);

-- ── Backfill: one primary location per existing business ─────────────────────
insert into locations (
  business_id, name, address, opening_hours,
  contact_phone, contact_whatsapp, contact_line, is_primary, is_active
)
select
  b.id, null, coalesce(nullif(b.location, ''), b.name), b.opening_hours,
  b.contact_phone, b.contact_whatsapp, b.contact_line, true, true
from businesses b
where not exists (select 1 from locations l where l.business_id = b.id);

-- Point existing staff / bookings / time_blocks at their business's primary location.
update staff s
  set location_id = l.id
  from locations l
  where l.business_id = s.business_id and l.is_primary and s.location_id is null;

update bookings bk
  set location_id = l.id
  from locations l
  where l.business_id = bk.business_id and l.is_primary and bk.location_id is null;

update time_blocks tb
  set location_id = l.id
  from locations l
  where l.business_id = tb.business_id and l.is_primary and tb.location_id is null;

-- ── updated_at trigger ───────────────────────────────────────────────────────
create or replace trigger trg_locations_updated_at
  before update on locations
  for each row execute function extensions.moddatetime(updated_at);

-- ── Row Level Security: public read, owner manages ───────────────────────────
alter table locations enable row level security;

drop policy if exists "locations_public_read" on locations;
create policy "locations_public_read"
  on locations for select
  using (true);

drop policy if exists "locations_owner_manage" on locations;
create policy "locations_owner_manage"
  on locations for all
  using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );
