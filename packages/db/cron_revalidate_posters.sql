-- Poster re-validation cron (PRD §5.3) — APPLY MANUALLY in the Supabase SQL editor.
-- NOT part of the auto-run migration chain: it depends on the pg_cron + pg_net
-- extensions and on environment-specific values (app URL + internal secret), so
-- running it blindly in CI/local would fail.
--
-- 1. Enable the extensions (Supabase: Database → Extensions, or run these):
--      create extension if not exists pg_cron;
--      create extension if not exists pg_net;
--
-- 2. Replace <APP_URL> with NEXT_PUBLIC_SITE_URL and <WORKER_SECRET> with
--    CONTENT_WORKER_SECRET, then run:

select cron.schedule(
  'revalidate-posters',
  '0 * * * *',            -- hourly; selects the N soonest-to-expire OK posters
  $$
  select net.http_post(
    url     := '<APP_URL>/api/content/revalidate-batch',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <WORKER_SECRET>"}'::jsonb,
    body    := '{"limit":50}'::jsonb
  );
  $$
);

-- To remove:  select cron.unschedule('revalidate-posters');
