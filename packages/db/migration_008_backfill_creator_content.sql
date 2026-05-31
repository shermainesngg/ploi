-- Migration 008: backfill links → creator_content (non-destructive)
-- One creator_content row per link that already has content. Existing manual
-- thumbnails become poster_source='upload' (absolute URL passes through the
-- host-agnostic poster resolver). links.content_* columns are KEPT — the old
-- read paths keep working until the cutover is verified (PRD §4.6).
-- Re-runnable: skips links that already have a creator_content row.

create extension if not exists pgcrypto;

insert into creator_content (
  link_id, creator_id, business_id,
  provider, content_url, external_id, url_hash,
  media_kind, aspect_ratio,
  poster_source, poster_path,
  fetch_status, status, sort_order
)
select
  l.id,
  l.creator_id,
  l.business_id,
  coalesce(l.platform, 'other'),
  l.content_url,
  null,
  -- url_hash keyed on (link id + url) so the backfill is collision-free and
  -- re-runnable; app submits compute their hash from the normalized URL.
  encode(digest(l.id::text || ':' || l.content_url, 'sha256'), 'hex'),
  'video',
  'vertical',
  case when l.content_thumbnail_url is not null then 'upload' else null end,
  l.content_thumbnail_url,
  -- Only "ok" (renderable) when a poster already exists; otherwise leave it
  -- pending so the worker can fetch one.
  case when l.content_thumbnail_url is not null then 'ok' else 'pending' end,
  'active',
  0
from links l
where l.content_url is not null
  and not exists (
    select 1 from creator_content cc where cc.link_id = l.id
  );
