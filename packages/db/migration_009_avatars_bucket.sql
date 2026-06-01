-- Migration 009: creator profile-photo storage
-- Public Storage bucket for creator avatars. Uploads go through the service-role
-- client (API route /api/creators/[slug]/avatar), so no INSERT/UPDATE RLS policy
-- is required; a public bucket gives anonymous read for rendering the photo.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
