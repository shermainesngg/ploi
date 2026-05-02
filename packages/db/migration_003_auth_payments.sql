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
