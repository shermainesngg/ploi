-- Migration 015: Google Calendar sync (Phase 1 — additive columns)
-- Backs the one-way PLOI → Google Calendar push. Confirmed bookings are written
-- to the owner's connected calendar; per-booking sync status is persisted so
-- silent failures stay visible and can be manually re-synced.
--
-- This migration is ADDITIVE ONLY. The Google plumbing columns scaffolded in
-- migration_006 already exist and must NOT be redeclared here:
--   businesses.google_calendar_id / google_refresh_token / google_sync_token /
--   google_last_synced_at, and bookings.google_event_id.
-- Here we add: per-booking sync status + timestamp, and the calendar timezone
-- (read once at connect time — booking_date/booking_time carry no timezone).
-- Idempotent: safe to re-run.

-- ── Per-booking sync status ───────────────────────────────────────────────────
alter table bookings
  add column if not exists google_sync_status text
    check (google_sync_status in ('pending', 'synced', 'failed')),
  add column if not exists google_synced_at   timestamptz;

-- ── Connected calendar timezone (captured at connect) ─────────────────────────
alter table businesses
  add column if not exists google_calendar_timezone text;
