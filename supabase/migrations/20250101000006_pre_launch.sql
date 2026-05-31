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
  add column if not exists google_calendar_id    text,
  add column if not exists google_refresh_token  text,
  add column if not exists google_sync_token     text,
  add column if not exists google_last_synced_at timestamptz;

alter table bookings
  add column if not exists google_event_id text;


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
