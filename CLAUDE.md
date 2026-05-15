# BRIDGE

Creator-to-commerce booking infrastructure that closes the attribution gap between social media content discovery and local service bookings. A creator posts about a local service, adds a BRIDGE link, a customer taps it, books, and the creator earns commission — with data proving who drove what.

## Business Model

Commission split on creator-attributed bookings only. Walk-in and direct bookings are free.

| Booking type | Creator | BRIDGE | Business |
|---|---|---|---|
| First booking via creator link | 10% | 5% | 85% |
| Repeat booking (6-month window) | 5% | 5% | 90% |
| Direct / walk-in | 0% | 0% | 100% |

Four entities: **Customer** (books via creator links), **Creator** (earns commission, gets attribution dashboard), **Business** (gets booking system + creator attribution), **BRIDGE** (infrastructure layer, earns 5% platform fee).

Target market: Bangkok first (beauty & wellness), Singapore for initial testing.

## Key Architectural Principle: The Discovery Loop

Every page leads to another page: Business page -> Creator chips -> Creator profile -> Other businesses -> repeat. This circular loop is how BRIDGE becomes a discovery platform, not just a booking tool. Every feature should reinforce this loop.

The scheduling suite is the trojan horse: businesses adopt BRIDGE because it's a better booking system than their paper diary. Once their schedule lives in BRIDGE, creator attribution is already built in.

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

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase public key
SUPABASE_SERVICE_ROLE_KEY       # Supabase server-side key (bypasses RLS)
STRIPE_SECRET_KEY               # Stripe test secret key (sk_test_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # Stripe test publishable key (pk_test_...)
STRIPE_WEBHOOK_SECRET           # From Stripe CLI (whsec_...)
NEXT_PUBLIC_SITE_URL            # http://localhost:3000 (update for production)
```

## Key Routes

| Route | Purpose |
|---|---|
| `/[creator]/[shop]` | Shop Booking Page via creator link (most important page) |
| `/[creator]` | Creator Profile Page |
| `/dashboard/business/[slug]` | Business dashboard |
| `/dashboard/creator/[slug]` | Creator dashboard |
| `/onboard/business` | Business signup |
| `/onboard/creator` | Creator signup |
| `/bookings` | Customer booking history |
| `/staff/[id]/schedule` | Staff schedule (shareable) |

## Design Direction

Primary accent: warm terracotta (`#c05636`). Mobile-first, clean sans-serif typography. UX inspired by ClassPass (booking flow), Instagram (creator social layer), Klook (service discovery). Shop Booking Page must load fast — minimal JS, no heavy animations.
