-- migration_013_booking_video_attribution.sql
-- Phase 2: per-video BOOKING attribution.
-- Records which video a booking is credited to, so a business can see how many
-- bookings (and how much revenue) each individual video drove — not just taps.
--
-- Credit model (hybrid, resolved client-side at booking time):
--   1. explicit per-video deep-link (?v=<content_id>) when the customer arrived via one
--   2. else the last video the customer tapped on the page this session
-- The column is nullable: direct/walk-in bookings and link-only arrivals have no video.

alter table bookings
  add column if not exists content_id uuid references creator_content(id);

create index if not exists idx_bookings_content_id on bookings(content_id);
