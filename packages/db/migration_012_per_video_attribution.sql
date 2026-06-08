-- migration_012_per_video_attribution.sql
-- Phase 1: per-video click attribution.
-- Makes the individual video a metric unit so a business can see, per creator,
-- how each video performed — not just the link-level total.
--
-- Adds:
--   • creator_content.click_count  — denormalized tap counter (mirrors links.click_count)
--   • attribution_events.content_id — which video drove the event (nullable: link-level
--                                     events have none)
--   • event_type 'content_click'    — a tap on a specific video's facade
--
-- Booking-level per-video attribution (bookings.content_id, ?v= deep-links) lands
-- in a later migration — see Phase 2.

alter table creator_content
  add column if not exists click_count integer not null default 0;

alter table attribution_events
  add column if not exists content_id uuid references creator_content(id);

-- Widen the event_type check to admit 'content_click'.
alter table attribution_events
  drop constraint if exists attribution_events_event_type_check;
alter table attribution_events
  add constraint attribution_events_event_type_check
  check (event_type in ('click', 'content_click', 'booking_started', 'booking_confirmed'));

create index if not exists idx_attribution_content_id on attribution_events(content_id);
