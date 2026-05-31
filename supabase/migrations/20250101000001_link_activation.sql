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
