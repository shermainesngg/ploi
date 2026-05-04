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
