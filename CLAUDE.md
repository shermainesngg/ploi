# PLOI

Creator-to-commerce booking infrastructure that closes the attribution gap between social media content discovery and local service bookings. A creator posts about a local service, adds a PLOI link, a customer taps it, books, and the creator earns commission — with data proving who drove what.

## Business Model

Commission split on creator-attributed bookings only. Walk-in and direct bookings are free.

| Booking type | Creator | PLOI | Business |
|---|---|---|---|
| First booking via creator link | 10% | 5% | 85% |
| Repeat booking (6-month window) | 5% | 5% | 90% |
| Direct / walk-in | 0% | 0% | 100% |

Four entities: **Customer** (books via creator links), **Creator** (earns commission, gets attribution dashboard), **Business** (gets booking system + creator attribution), **PLOI** (infrastructure layer, earns 5% platform fee).

Target market: Bangkok first (beauty & wellness), Singapore for initial testing.

## Key Architectural Principle: The Discovery Loop

Every page leads to another page: Business page -> Creator chips -> Creator profile -> Other businesses -> repeat. This circular loop is how PLOI becomes a discovery platform, not just a booking tool. Every feature should reinforce this loop.

The scheduling suite is the trojan horse: businesses adopt PLOI because it's a better booking system than their paper diary. Once their schedule lives in PLOI, creator attribution is already built in.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Styling**: Tailwind CSS 3 with CSS custom properties for theming (light/dark)
- **Database**: PostgreSQL via Supabase (hosted)
- **Auth**: Supabase Auth with magic link (email-based, no passwords)
- **Payments**: Stripe Connect (test mode) — platform account with connected business accounts
- **Validation**: Zod 4
- **Testing**: Vitest with Testing Library
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Utilities**: clsx + tailwind-merge via `cn()` helper

## Commands

```bash
npm run dev          # Start Next.js dev server (from root — runs apps/web)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode) — run from apps/web
```

## Project Structure

Monorepo with npm workspaces:

```
apps/web/                       # Next.js frontend (all pages, API routes, components)
  src/
    app/                        # Next.js App Router pages and API routes
      [creator]/[shop]/         # Shop Booking Page via creator link (most important page)
      [creator]/                # Creator Profile Page
      dashboard/business/       # Business dashboard (Overview, Calendar, Bookings, Creators tabs)
      dashboard/creator/        # Creator dashboard (stats, links, earnings)
      api/                      # REST API routes
    actions/                    # Server Actions (Zod-validated, call services)
    services/                   # Business logic layer (orchestrates repos)
    repositories/               # Data access layer (Supabase queries)
    validation/                 # Zod schemas for input validation
    components/
      ui/                       # Reusable primitives (Button, Card, Input, Modal, Badge, etc.)
      dashboard/                # Dashboard tab components (OverviewTab, BookingsTab, CreatorsTab)
      *.tsx                     # Feature components (ShopBookingPage, CreatorDashboard, etc.)
    lib/                        # Shared utilities, types, Supabase clients, Stripe setup
    middleware.ts               # Supabase session refresh on every request
packages/db/                    # SQL schema, migrations (001-005), seed data
packages/shared/                # Shared TypeScript types
packages/config/                # Shared configuration
```

## Architecture Layers

Code follows a strict layered architecture. Keep logic in the right layer:

```
Page/Component  ->  Server Action  ->  Service  ->  Repository  ->  Supabase
     (UI)          (validation)     (business     (data access)    (database)
                                     logic)
```

- **Server Actions** (`src/actions/`): `'use server'` functions. Validate input with Zod, call services, return `{ success }` or `{ error }`.
- **Services** (`src/services/`): Business logic. Orchestrate multiple repos. Never import Supabase directly.
- **Repositories** (`src/repositories/`): Thin Supabase query wrappers. One per table. Use `createServerClient()`.
- **Validation** (`src/validation/`): Zod schemas. One file per domain. Export both schema and inferred type.

## Patterns and Conventions

### Naming
- Files: PascalCase for components (`ShopBookingPage.tsx`), kebab-case for non-components (`seed-data.ts`)
- Services/repos: `{domain}.service.ts`, `{domain}.repo.ts`, `{domain}.actions.ts`, `{domain}.schema.ts`
- Exported objects: `BookingService`, `BookingRepo`, `AttributionService` (PascalCase namespace objects, not classes)
- Types/interfaces: PascalCase (`BookingWithCreator`, `CreateBookingInput`)

### Components
- UI primitives in `src/components/ui/` — exported via barrel `index.ts`
- Variants defined as plain objects with `as const`, selected via prop
- Use `forwardRef` for primitives. Use `cn()` for className merging
- `'use client'` only on interactive components. Pages are server components by default
- Icons from `lucide-react`

### Styling
- All colors use CSS custom properties via `bridge-*` Tailwind tokens (e.g., `bg-bridge-card`, `text-bridge-accent`)
- Light and dark themes defined in `globals.css` as `:root` and `.dark` variables
- Custom spacing tokens: `section`, `card-padding`, `input-y`, `input-x`
- Custom border-radius tokens: `card`, `button`, `input`, `modal`, `badge`
- Custom font sizes: `display`, `heading`, `title`, `body-lg`, `body`, `label`, `caption`, `micro`
- Mobile-first — every page must work on phone. Desktop is secondary

### Data Access
- Supabase client factories in `src/lib/supabase.ts` and `supabase-server.ts`
- `createServerClient()` for server-side (bypasses RLS with service role key)
- `createAuthBrowserClient()` for client components that need auth state
- Seed data fallback in `src/lib/seed-data.ts` — used when Supabase is not configured
- Prices stored as integers in THB (no decimals)

### Testing
- Vitest with `vi.mock()` for repo dependencies
- Tests co-located with source: `*.test.ts` next to `*.ts`
- Mock repos, test service logic in isolation

### Attribution System
- Phone number is the attribution key (normalized via `src/lib/phone.ts`)
- First booking via creator link: 10% commission, creates customer acquisition record
- Repeat booking within 6-month window: 5% residual, auto-attributed to original creator
- Direct/walk-in: no attribution, no commission
- Commission constants in `src/lib/constants.ts`

## Database

Schema in `packages/db/schema.sql`. Migrations run in order in Supabase SQL Editor:
- `schema.sql` — Core tables: businesses, services, creators, links, bookings, attribution_events, consumers
- `migration_001` — Link status (pending/active/declined), content URLs, creator socials
- `migration_002` — Business photos, hours, contacts
- `migration_003` — Auth user IDs, Stripe account IDs, consumers, payment fields
- `migration_004` — Staff, availability, business hours, time slots, booking actions
- `migration_005` — Featured service on links, customer acquisitions for repeat attribution
- `migration_006_pre_launch` — Payout ledger, currency (THB/SGD), consumer↔booking FK, `updated_at` triggers, cancellation metadata, Google Calendar prep, **Row Level Security**
- `migration_007`–`009` — Creator content embeds + backfill, avatars storage bucket
- `migration_010_multi_featured` — Multiple featured services per link (`featured_service_ids uuid[]`); supersedes the single `featured_service_id` from 005, kept for back-compat
- `migration_011_business_photos_bucket` — Public `business-photos` Storage bucket for dashboard Settings photo uploads (already created in staging; run in prod)
- `migration_012`–`013` — Per-video creator attribution + booking↔video link
- `migration_014_multi_location` — Multi-location businesses (branches); per-location staff/bookings/time_blocks
- `migration_015_calendar_sync` — Google Calendar sync: per-booking `google_sync_status`/`google_synced_at` + `businesses.google_calendar_timezone` (additive to the dormant 006 Google columns)
- `migration_016_reschedule_proposals` — Business-proposed reschedule for pending bookings: `bookings.reschedule_proposed_date`/`_time`/`_at` + `reschedule_token` (tokenised customer accept/decline link). Booking stays `pending` while a proposal is outstanding.

`packages/db/setup.sql` is the **consolidated schema** (core tables + all migrations in one file) — run it for a fresh project instead of applying migrations one by one.

## Environments

Two separate Supabase projects, each with its own URL + keys:

- **Staging** — what local dev points at via `.env.local`. Safe to seed with demo data.
- **Production** — its own project; **never seed with demo data**. Always confirm which project `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` resolves to before running any write/seed.

> Network note: the direct Postgres host (`db.<ref>.supabase.co`) is **IPv6-only** and unreachable from some networks. Use the **session pooler** connection string (`aws-0-<region>.pooler.supabase.com`, IPv4) for `psql`/CLI access, or the REST-based seed runner below (HTTPS, always reachable).

## Seeding

- **Canonical SQL seed**: `packages/db/seed.sql` — idempotent (safe to re-run; never deletes FK-referenced rows). Run it in the Supabase **SQL Editor** after `setup.sql`. This is the source of truth for demo data.
- **REST seed runner**: `apps/web/scripts/seed-staging.mjs` — seeds the same demo businesses/creators/links over the REST API using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS), for when Postgres isn't directly reachable. Idempotent (upsert by id / `(creator_id, business_id)`; services insert-if-missing). Run from repo root:
  ```bash
  node apps/web/scripts/seed-staging.mjs   # reads .env.local — confirm it points at STAGING first
  ```
  Keep `seed.sql` and the runner in sync when adding demo data so both paths produce the same result.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL             # Supabase project URL (determines staging vs prod)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY # Supabase public key. The code also accepts the legacy
                                     #   name NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable preferred).
SUPABASE_SERVICE_ROLE_KEY            # Server-side secret key (sb_secret_...), bypasses RLS — never expose to browser
                                     #   (SUPABASE_SECRET_KEY is also accepted as an alias)
SUPABASE_DB_URL                      # Postgres connection string (use the session-pooler host for IPv4 access)
STRIPE_SECRET_KEY                    # Stripe secret key (sk_test_... / sk_live_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   # Stripe publishable key (pk_test_... / pk_live_...)
STRIPE_WEBHOOK_SECRET                # From Stripe CLI / webhook endpoint (whsec_...)
NEXT_PUBLIC_SITE_URL                 # http://localhost:3000 (update for production)
RESEND_API_KEY                       # Resend API key (re_...) for booking notification emails.
                                     #   Optional — without it emails are silent no-ops.
EMAIL_FROM                           # Sender, e.g. "PLOI <bookings@ploi.app>" (domain must be
                                     #   verified in Resend). Defaults to Resend's test sender,
                                     #   which only delivers to the Resend account owner.
GOOGLE_CLIENT_ID                     # Google OAuth client id (Web application) for Calendar sync.
GOOGLE_CLIENT_SECRET                 # Google OAuth client secret. Optional — without these (and
                                     #   GCAL_TOKEN_ENC_KEY) calendar sync is a silent no-op.
GCAL_TOKEN_ENC_KEY                   # AES-256-GCM key encrypting the stored Google refresh token at
                                     #   rest. Base64-encoded 32 bytes: `openssl rand -base64 32`.
                                     #   Server-only — never expose to browser.
```

> **Key-name tolerance.** `lib/supabase.ts` / `supabase-server.ts` / `middleware.ts` resolve the public key from `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **or** `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the secret key from `SUPABASE_SERVICE_ROLE_KEY` **or** `SUPABASE_SECRET_KEY`. If neither public key is set, `isSupabaseConfigured()` is false and the app **silently falls back to the in-memory `seed-data.ts`** (one demo business/creator) instead of the real DB — the usual cause of "I don't see my seeded data" on a deployment.

### Env files & where each is loaded

| File | Loaded by | Points at |
|---|---|---|
| `apps/web/.env.local` | the Next app (`next dev/build/start`, cwd is `apps/web`) | **staging** |
| `.env.local` (repo root) | the seed runner `scripts/seed-staging.mjs` (run from root) | **staging** |
| `.env.prod` (repo root) | nothing automatically — reference for Vercel **Production** vars / deliberate prod scripts (`node --env-file=.env.prod …`) | **prod** |

All `.env*` files are gitignored. Production app config lives in **Vercel env vars**, not a file. On Vercel, **staging deploys are Preview deployments** — their env vars must be set under the **Preview** scope (pointing at the staging Supabase project); Production-scope vars don't apply to them. After changing Vercel env vars, **redeploy** — existing deployments don't pick them up.

## Key Routes

| Route | Purpose |
|---|---|
| `/[creator]/[shop]` | Shop Booking Page via creator link (most important page) |
| `/[creator]` | **Shared `/[slug]` namespace** — resolves creator-first, falls back to a standalone business page (see below) |
| `/shop/[slug]` | Standalone business booking page — direct/organic discovery, no creator attribution |
| `/search` | Site-wide search (separate Creators / Businesses tabs) |
| `/business` | Business home — signed-in owners see their dashboard (post-login landing for businesses); visitors see the marketing landing page |
| `/dashboard/business/[slug]` | Business dashboard (canonical slugged URL; renders the same `BusinessDashboardScreen` as `/business`) |
| `/dashboard/creator/[slug]` | Creator dashboard (Overview + Requests tabs) |
| `/onboard/business` | Business signup |
| `/onboard/creator` | Creator signup |
| `/bookings` | Customer booking history |
| `/staff/[id]/schedule` | Staff schedule (shareable) |

### Discovery & Search

- **Shared `/[slug]` namespace.** A single segment resolves to a creator profile if one exists, otherwise to a standalone business booking page (`creator: null` → direct booking, no attribution). Because creators and businesses share one URL namespace, **slugs must be globally unique across both** — `BusinessService.create` and `CreatorService.create` each reject a slug already claimed by the other type. `/shop/[slug]` is the dedicated, unambiguous direct-booking route (used by home/search links and `BusinessService.getBySlug`); the bare `/[slug]` fallback also resolves businesses. Reserved static routes (`/search`, `/login`, `/bookings`, `/dashboard`, etc.) shadow `/[slug]`, so they can't be valid slugs.
- **Search.** `/search` is a client page with two separate searches toggled by tab. Backed by `GET /api/businesses/search` and `GET /api/creators/search`, which call `BusinessService.search` / `CreatorService.search` (name/handle/slug `ilike`, seed-data fallback). Business results link to `/shop/[slug]`, creator results to `/[creator]`. The NavBar search icon opens `/search`.
- **Home page.** `components/HomeExperiences.tsx` owns the hero + explore. Hero is a large, copy-forward landing band that states what PLOI is. Explore is Fresha-style: a "Browse by category" image-tile row (tap to filter), then three curated horizontal carousels — **Recommended** (top rated), **Newly added** (newest from `BusinessService.list()`, which is `created_at desc`), **Trending** (most-reviewed, a popularity proxy until real engagement is tracked). Searching or selecting a category swaps the carousels for a results grid.
- **NavBar menu** (`components/NavBar.tsx`) is role-aware: a **Creator** and/or **Business** section (each linking that dashboard, shown per owned slug), a **regular** section for any non-business identity (My bookings, Saved content, Saved businesses), and onboarding links only shown to visitors who don't already own that role. Note: **Saved content / Saved businesses are nav placeholders** (`/saved/content`, `/saved/businesses`) — the pages and underlying save/bookmark model are not built yet.

## Design Direction

Per the **PLOI Brand Guidelines V3** (see `.impeccable.md` for the full Design Context). Palette: Ink `#0D1117` (60%) · Warm White `#FAF9F6` / Stone `#E8E4DE` (30%) · Charcoal `#6B6B6B` (8%) · **Coral `#E05A47`** as the system accent (2% — actions, booking CTAs, earnings, highlights, positive states only). Structural CTAs use ink (the `--bridge-ink` token: black on light, white on dark), not coral. Typography: **Plus Jakarta Sans** (primary) + **Space Mono** (`font-data` — earnings, prices, IDs, timestamps). Light + dark themes. Logo: P-gem mark + `PLOI` wordmark (`components/ui/Logo.tsx`). Mobile-first; the Shop Booking page loads fast (minimal JS, no heavy animation) and uses the "invisible brand" mode (business is the star, PLOI recedes to a `PoweredByPloi` badge). UX inspired by ClassPass (booking flow), Instagram (creator social layer), Klook (service discovery).

### Design Principles
1. **Coral is a guest, not the host.** Reserve coral for money, booking CTAs, and positive states. Primary `Button` is ink; the coral booking action is `Button variant="book"`.
2. **Be invisible when the work isn't yours.** Customer-facing business/creator pages recede to `PoweredByPloi`. Loud PLOI branding belongs only to marketing + dashboards.
3. **Data wears Space Mono.** Earnings, prices, counts, IDs, timestamps use `font-data` with tight tracking.
4. **Warm, tinted neutrals — never pure black/white, never off-palette.** No purple/amber/cyan; everything resolves to ink, warm white, stone, charcoal, or coral. (Conventional semantic status colors — green confirmed / amber pending / red cancelled — are retained.)
