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
