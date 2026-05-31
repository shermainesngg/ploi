-- Migration 007: creator_content — first-class 1:many content entity
-- Content moves off `links` (display-only fields stay) into a dedicated table that
-- powers the company-page content wall + async oEmbed/poster pipeline.
-- NOTE: numbered 007 because 006 is taken by migration_006_pre_launch.sql.
-- Keep links.content_url / platform / content_thumbnail_url — do NOT drop here.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists creator_content (
  id              uuid primary key default uuid_generate_v4(),

  -- relationships (link_id implies creator+business, but denormalize for indexing)
  link_id         uuid not null references links(id) on delete cascade,
  creator_id      uuid not null references creators(id) on delete cascade,
  business_id     uuid not null references businesses(id) on delete cascade,

  -- source identity
  provider        text not null
                    check (provider in ('tiktok','instagram','youtube','x','other')),
  content_url     text not null,
  external_id     text,                 -- numeric id (TikTok) | shortcode (IG/YouTube)
  url_hash        text not null,        -- sha256 of normalized URL; idempotency key

  -- media description
  media_kind      text not null default 'video'
                    check (media_kind in ('video','image','carousel')),
  aspect_ratio    text not null default 'vertical'
                    check (aspect_ratio in ('square','portrait','vertical','video')),

  -- poster
  poster_source   text                  -- 'oembed'|'predictable'|'og'|'upload'|'branded'
                    check (poster_source is null or poster_source in
                      ('oembed','predictable','og','upload','branded')),
  poster_path     text,                 -- HOST-AGNOSTIC key (not a full URL)
  caption         text,
  author_name     text,

  -- ingestion pipeline state — owned by the worker
  fetch_status    text not null default 'pending'
                    check (fetch_status in ('pending','fetching','ok','failed','unavailable')),
  attempts        integer not null default 0,
  last_attempt_at timestamptz,
  poster_expires_at timestamptz,

  -- moderation state — SEPARATE axis from fetch_status, owned by the business
  status          text not null default 'pending'
                    check (status in ('pending','active','hidden')),

  sort_order      integer not null default 0,
  created_at      timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Hot path: active content for a business, pre-sorted (partial composite kills the Sort node)
create index if not exists idx_creator_content_business_active
  on creator_content (business_id, sort_order) where status = 'active';

-- Creator profile page: a creator's active content
create index if not exists idx_creator_content_creator_active
  on creator_content (creator_id) where status = 'active';

-- Join/filter by link
create index if not exists idx_creator_content_link on creator_content (link_id);

-- Dedup guard: a creator can't attach the same video to a business twice
create unique index if not exists uq_creator_content_external
  on creator_content (business_id, provider, external_id);

-- Idempotency for the ingestion pipeline
create unique index if not exists uq_creator_content_url_hash on creator_content (url_hash);
