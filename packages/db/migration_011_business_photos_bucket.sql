-- Migration 011: business photo storage
-- Public Storage bucket for business gallery/cover photos. Uploads go through
-- the service-role client (API route /api/businesses/[slug]/photos), so no
-- INSERT/UPDATE RLS policy is required; a public bucket gives anonymous read
-- for rendering the photos.

insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do nothing;
