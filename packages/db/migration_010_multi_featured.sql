-- Migration 010: Multiple featured services per BRIDGE link
-- A creator can feature one OR MORE services on a link, or feature the place
-- only (empty array). Supersedes the single featured_service_id (migration 005),
-- which is kept for backward compatibility and backfilled below.

alter table links
  add column if not exists featured_service_ids uuid[] not null default '{}';

-- Backfill the array from the legacy single column for existing rows.
update links
set featured_service_ids = array[featured_service_id]
where featured_service_id is not null
  and (featured_service_ids is null or featured_service_ids = '{}');

-- GIN index for membership/containment queries on the array.
create index if not exists idx_links_featured_services on links using gin (featured_service_ids);
