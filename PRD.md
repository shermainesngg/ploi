# PRD: BRIDGE Architecture Redesign

## 1. Executive Summary

BRIDGE is a creator-driven local experiences booking platform that connects consumers with local businesses through creator recommendations. Creators share affiliate links to businesses; when consumers book through those links, BRIDGE tracks attribution and splits commissions (10% first booking, 5% repeat) between creators, businesses, and the platform.

The current MVP is functional but has accumulated significant architectural debt: a 2,000-line god file (`db.ts`) that mixes data access, business logic, and row mapping; API routes that duplicate business logic from the data layer; no service layer or separation of concerns; zero test coverage; and no use of Next.js 15's modern patterns (Server Actions, Suspense streaming, caching). Client components are oversized (the booking page alone is 1,389 lines) and use `any` types extensively.

Beyond the code architecture, the UI itself — while functional and warm — lacks a formalized design system. Styling is applied ad-hoc across 20+ client components with no shared primitives (buttons, cards, inputs, modals). Spacing, icon sizing, and typography weights vary between screens. The result looks decent but not polished or cohesive enough for a consumer-facing booking platform competing for trust.

This redesign restructures BRIDGE using Next.js best practices to optimize for **developer velocity and feature maintainability**, while simultaneously elevating the UI to a professional, cohesive standard — making it easy to add features like reviews, notifications, cancellation policies, and multi-location support without cascading breakage or visual inconsistency.

---

## 2. Mission

**Product mission:** Make it effortless for consumers to discover and book local experiences through creators they trust, while giving businesses and creators transparent attribution and fair compensation.

**Redesign mission:** Restructure the codebase so that any developer can add a new feature by touching only the files that matter, with confidence that existing features won't break — and elevate the visual quality so every screen feels intentionally designed, cohesive, and trustworthy.

### Core Principles

1. **Separation of concerns** — HTTP handling, business logic, and data access live in distinct layers with clear contracts.
2. **Server-first** — Use Server Components and Server Actions as the default; client components only for interactivity that requires browser APIs.
3. **Type safety end-to-end** — Zod schemas at system boundaries, shared TypeScript types for internal contracts, zero `any` casts.
4. **Progressive enhancement** — Suspense boundaries, streaming, and caching for performance without sacrificing simplicity.
5. **Testability by design** — Each layer can be tested in isolation; service functions are pure-ish and don't depend on Next.js runtime.
6. **Impeccable UI** — Every component should look intentionally crafted. Consistent spacing, typography, and interaction patterns across all screens. The UI should build trust with consumers and convey professionalism to business owners.

---

## 3. Target Users

### Developer (Primary user of this redesign)
- Solo developer or small team (1-3 engineers)
- Familiar with TypeScript and React, learning Next.js App Router patterns
- Needs to ship features fast without breaking existing flows
- Pain points: afraid to touch `db.ts`, unclear where business logic lives, can't write tests because everything is coupled

### Business Owner (End user)
- Manages bookings, staff schedules, creator partnerships
- Needs reliable dashboard, real-time availability, Stripe payouts
- Pain points: none directly from architecture, but bugs and slow feature delivery affect them

### Creator (End user)
- Shares affiliate links, tracks earnings and attribution
- Needs accurate click/booking tracking, timely dashboard updates
- Pain points: same as above — architecture debt slows feature improvements

### Consumer (End user)
- Discovers businesses via creator links, books services, pays via Stripe
- Needs fast page loads (SEO-critical public pages), smooth booking flow
- Pain points: no loading states, no error recovery, slow initial page loads

---

## 4. MVP Scope

### In Scope (Architecture Redesign)

**Core Restructuring**
- [ ] Extract service layer from `db.ts` into domain-specific modules
- [ ] Split `db.ts` into focused repository modules (data access only)
- [ ] Introduce Zod validation schemas at API/action boundaries
- [ ] Convert mutations from API routes to Server Actions where appropriate
- [ ] Keep API routes only for webhook handlers and external integrations (Stripe)
- [ ] Remove scaffolded Fastify backend (`apps/api/`)

**Next.js Best Practices**
- [ ] Add Suspense boundaries and `loading.tsx` for streaming
- [ ] Add `error.tsx` error boundaries per route segment
- [ ] Implement `unstable_cache` / `revalidateTag` caching strategy
- [ ] Use `dynamic` route segment config where appropriate
- [ ] Split oversized client components into smaller composable units

**Type Safety**
- [ ] Consolidate types into `packages/shared` (remove `apps/web/src/lib/types.ts` duplication)
- [ ] Replace all `any` casts with proper types
- [ ] Add Zod schemas for all external inputs (form data, API payloads, webhook bodies)

**Testing Infrastructure**
- [ ] Set up Vitest + React Testing Library
- [ ] Unit tests for service layer functions
- [ ] Integration tests for critical flows (booking creation, attribution, checkout)
- [ ] Component tests for key interactive components

**UI & Aesthetic Overhaul**
- [ ] Build a shared design system with reusable primitives (Button, Card, Input, Modal, Badge, StatusIndicator)
- [ ] Establish and enforce design tokens: spacing scale, typography scale, shadow scale, border-radius scale
- [ ] Redesign all public-facing pages (home, creator profile, booking page) to impeccable standard
- [ ] Redesign dashboards (business + creator) for visual polish and information clarity
- [ ] Redesign onboarding flows (business + creator) for a guided, premium feel
- [ ] Standardize all form inputs, buttons, and interactive elements across the app
- [ ] Add purposeful micro-interactions and transitions (not just functional, but delightful)
- [ ] Improve visual hierarchy with consistent use of whitespace, type weight, and color
- [ ] Ensure responsive design works beyond 480px (tablet, desktop) while staying mobile-first

**Code Quality**
- [ ] Consistent error handling patterns across all layers
- [ ] Remove seed data fallback from production code paths (isolate to dev/demo mode)

### Out of Scope (Future Phases)

- [ ] Database migration to a different provider (staying on Supabase)
- [ ] Real-time features (WebSocket subscriptions for live booking updates)
- [ ] Internationalization (i18n)
- [ ] Multi-location business support
- [ ] Review/rating system
- [ ] Push notifications
- [ ] Email transactional system (Resend/SendGrid)
- [ ] CI/CD pipeline setup
- [ ] Performance monitoring (Sentry, Vercel Analytics)
- [ ] Mobile app or PWA

---

## 5. User Stories

1. **As a developer**, I want business logic in one predictable place, so that when I need to change how attribution works, I edit one service file and its tests — not three API routes and `db.ts`.

2. **As a developer**, I want mutations to use Server Actions, so that form submissions don't require manual `fetch` calls and I get built-in progressive enhancement and revalidation.

3. **As a developer**, I want Zod schemas at every input boundary, so that type errors are caught at the edge and I never see "Cannot read property of undefined" from malformed payloads.

4. **As a developer**, I want tests for the service layer, so that I can refactor data access or add features with confidence that existing business rules still hold.

5. **As a consumer**, I want the booking page to load fast with visible progress, so that I don't see a blank screen while staff availability is being computed.

6. **As a business owner**, I want dashboard errors to be caught gracefully, so that a single failed query doesn't blank out my entire dashboard.

7. **As a developer**, I want client components under 300 lines each, so that I can understand and modify any component without scrolling through 1,400 lines of mixed concerns.

8. **As a developer**, I want a clear data flow — Server Component fetches data, passes to Client Component for interactivity — so that I never wonder "where does this data come from?"

---

## 6. Core Architecture & Patterns

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│  Presentation Layer                              │
│  Server Components → Client Components           │
│  Server Actions (mutations)                      │
│  API Routes (webhooks, external integrations)    │
├─────────────────────────────────────────────────┤
│  Service Layer  (business logic)                 │
│  services/booking.ts                             │
│  services/attribution.ts                         │
│  services/availability.ts                        │
│  services/staff.ts                               │
│  services/creator.ts                             │
│  services/business.ts                            │
│  services/checkout.ts                            │
├─────────────────────────────────────────────────┤
│  Data Access Layer  (repositories)               │
│  repositories/booking.repo.ts                    │
│  repositories/business.repo.ts                   │
│  repositories/creator.repo.ts                    │
│  repositories/link.repo.ts                       │
│  repositories/staff.repo.ts                      │
│  repositories/attribution.repo.ts                │
├─────────────────────────────────────────────────┤
│  Infrastructure                                  │
│  lib/supabase.ts (client factory)                │
│  lib/stripe.ts (Stripe client)                   │
│  lib/validation/ (Zod schemas)                   │
│  packages/shared/ (types, constants)             │
└─────────────────────────────────────────────────┘
```

### Target Directory Structure

```
apps/web/src/
├── app/
│   ├── (public)/                     # Public route group
│   │   ├── [creator]/
│   │   │   ├── [shop]/
│   │   │   │   ├── page.tsx          # Server: fetch data
│   │   │   │   ├── loading.tsx       # Skeleton
│   │   │   │   └── error.tsx         # Error boundary
│   │   │   └── page.tsx
│   │   ├── page.tsx                  # Home
│   │   └── layout.tsx
│   ├── (auth)/                       # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/                  # Authenticated route group
│   │   ├── dashboard/
│   │   │   ├── business/[slug]/
│   │   │   └── creator/[slug]/
│   │   ├── bookings/
│   │   └── layout.tsx                # Auth guard
│   ├── api/                          # API routes (minimal)
│   │   ├── webhooks/stripe/route.ts  # Stripe webhook
│   │   └── auth/callback/route.ts    # OAuth callback
│   └── layout.tsx
├── actions/                          # Server Actions
│   ├── booking.actions.ts
│   ├── business.actions.ts
│   ├── creator.actions.ts
│   ├── link.actions.ts
│   └── staff.actions.ts
├── services/                         # Business logic
│   ├── booking.service.ts
│   ├── attribution.service.ts
│   ├── availability.service.ts
│   ├── checkout.service.ts
│   ├── staff.service.ts
│   ├── creator.service.ts
│   └── business.service.ts
├── repositories/                     # Data access (Supabase queries)
│   ├── booking.repo.ts
│   ├── business.repo.ts
│   ├── creator.repo.ts
│   ├── link.repo.ts
│   ├── staff.repo.ts
│   └── attribution.repo.ts
├── components/                       # UI components
│   ├── booking/
│   │   ├── BookingWizard.tsx         # Orchestrator (client)
│   │   ├── ServicePicker.tsx         # Step 1
│   │   ├── DatePicker.tsx            # Step 2
│   │   ├── TimeSlotPicker.tsx        # Step 3
│   │   ├── BookingDetails.tsx        # Step 4
│   │   └── BookingConfirmation.tsx   # Success
│   ├── dashboard/
│   │   ├── business/
│   │   └── creator/
│   ├── onboarding/
│   │   ├── BusinessOnboardingWizard.tsx
│   │   └── CreatorOnboardingWizard.tsx
│   ├── staff/
│   └── ui/                           # Shared primitives
│       ├── LoadingSkeleton.tsx
│       └── ErrorDisplay.tsx
├── lib/                              # Infrastructure
│   ├── supabase.ts
│   ├── supabase-server.ts
│   ├── stripe.ts
│   ├── auth.ts
│   └── phone.ts
└── validation/                       # Zod schemas
    ├── booking.schema.ts
    ├── business.schema.ts
    ├── creator.schema.ts
    └── common.schema.ts
```

### Key Design Patterns

**1. Server Actions for mutations (replace most API routes)**

```typescript
// actions/booking.actions.ts
'use server'

import { createBookingSchema } from '@/validation/booking.schema'
import { BookingService } from '@/services/booking.service'
import { revalidateTag } from 'next/cache'

export async function createBooking(formData: FormData) {
  const parsed = createBookingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }

  const result = await BookingService.create(parsed.data)
  revalidateTag(`bookings-${parsed.data.businessId}`)
  return result
}
```

**2. Services own business logic (no DB imports)**

```typescript
// services/booking.service.ts
import { BookingRepo } from '@/repositories/booking.repo'
import { AttributionService } from './attribution.service'
import { StaffService } from './staff.service'

export const BookingService = {
  async create(input: CreateBookingInput) {
    const attribution = await AttributionService.resolve({
      customerPhone: input.customerPhone,
      businessId: input.businessId,
      linkId: input.linkId,
    })

    const staffId = input.staffId
      ?? await StaffService.pickEligible({ ... })

    const booking = await BookingRepo.insert({ ...input, staffId, ...attribution })

    if (attribution.shouldCreateAcquisition) {
      await AttributionService.createAcquisition({ ... })
    }

    return { id: booking.id, status: booking.status }
  },
}
```

**3. Repositories are pure data access (no business logic)**

```typescript
// repositories/booking.repo.ts
import { createServerClient } from '@/lib/supabase'

export const BookingRepo = {
  async insert(data: BookingInsert) {
    const db = createServerClient()
    const { data: row, error } = await db
      .from('bookings')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  },

  async findById(id: string) { ... },
  async updateStatus(id: string, status: string) { ... },
  async listByBusiness(businessId: string, opts?: ListOpts) { ... },
}
```

**4. API routes only for external integrations**

```typescript
// Only keep API routes for:
// 1. Stripe webhooks (POST /api/webhooks/stripe) — requires raw body + signature verification
// 2. OAuth callback (GET /api/auth/callback) — Supabase redirect handler
// 3. Stripe checkout session creation — needs to return a redirect URL
```

**5. Suspense boundaries for streaming**

```typescript
// app/(public)/[creator]/[shop]/page.tsx
import { Suspense } from 'react'
import { BookingPageSkeleton } from '@/components/booking/BookingPageSkeleton'

export default async function ShopPage({ params }) {
  const { creator, shop } = await params
  const pageData = await getPageData(creator, shop)

  return (
    <>
      <BusinessHero business={pageData.business} />
      <Suspense fallback={<BookingPageSkeleton />}>
        <BookingSection business={pageData.business} creator={pageData.creator} />
      </Suspense>
    </>
  )
}
```

---

## 7. Features (Redesign Deliverables)

### F1: Service Layer Extraction

**Purpose:** Single source of truth for business logic.

| Domain | Current Location | Target |
|--------|-----------------|--------|
| Booking creation | `db.ts` (createBooking) + `checkout/route.ts` | `services/booking.service.ts` |
| Attribution resolution | `db.ts` (resolveAttribution, findActiveAcquisition, createAcquisition) | `services/attribution.service.ts` |
| Availability computation | `lib/availability.ts` | `services/availability.service.ts` |
| Staff assignment | `db.ts` (pickEligibleStaff) | `services/staff.service.ts` |
| Dashboard aggregation | `db.ts` (getBusinessDashboard, getCreatorDashboard, rollupByCreator) | `services/dashboard.service.ts` |
| Checkout orchestration | `api/checkout/route.ts` | `services/checkout.service.ts` |

### F2: Repository Layer

**Purpose:** Clean data access with typed return values.

| Repository | Tables | Key Operations |
|-----------|--------|----------------|
| `booking.repo.ts` | bookings | insert, findById, updateStatus, listByBusiness, listByDate, listByStaff |
| `business.repo.ts` | businesses, services | findBySlug, insert, search, updateStripeAccount, listServices |
| `creator.repo.ts` | creators | findBySlug, insert, findByEmail |
| `link.repo.ts` | links, attribution_events | findByCreatorAndBusiness, insert, updateStatus, recordClick |
| `staff.repo.ts` | staff, staff_services, staff_schedules, time_blocks | findByBusiness, insert, updateSchedule, listBlocks |
| `attribution.repo.ts` | customer_acquisitions, attribution_events | findActiveAcquisition, insertAcquisition, insertEvent |

### F3: Server Actions Migration

**Purpose:** Replace API route mutations with Server Actions for forms.

| Current API Route | Becomes | Reason |
|-------------------|---------|--------|
| `POST /api/businesses` | `actions/business.actions.ts` | Form submission |
| `POST /api/creators` | `actions/creator.actions.ts` | Form submission |
| `POST /api/links` | `actions/link.actions.ts` | Form submission |
| `PATCH /api/bookings/[id]` | `actions/booking.actions.ts` | Status update from dashboard |
| `PUT /api/staff/[id]/schedule` | `actions/staff.actions.ts` | Schedule management |
| `POST /api/staff/[id]/blocks` | `actions/staff.actions.ts` | Block management |
| `POST /api/businesses/[slug]/staff` | `actions/staff.actions.ts` | Staff CRUD |
| `POST /api/businesses/[slug]/walkin` | `actions/booking.actions.ts` | Walk-in form |
| `POST /api/checkout` | **Stays API route** | Needs to return Stripe redirect URL |
| `POST /api/webhooks/stripe` | **Stays API route** | External webhook |
| `POST /api/links/[id]/click` | **Stays API route** | Called from client-side tracking |
| `GET /api/businesses/[slug]/availability` | **Stays API route** | Polled from client for real-time slots |

### F4: Component Decomposition

**Purpose:** No client component over 300 lines.

| Current Component | Lines | Split Into |
|-------------------|-------|-----------|
| `ShopBookingPage.tsx` | 1,389 | `BookingWizard` (orchestrator), `ServicePicker`, `DatePicker`, `TimeSlotPicker`, `BookingDetails`, `BookingConfirmation`, `BusinessHero` |
| `CreatorOnboarding.tsx` | 716 | `CreatorOnboardingWizard` (orchestrator), `HandleStep`, `ProfileStep`, `SocialsStep`, `ReviewStep` |
| `BusinessOnboarding.tsx` | 626 | `BusinessOnboardingWizard` (orchestrator), `BasicInfoStep`, `CategoryStep`, `HoursStep`, `ServicesStep`, `PhotosStep` |
| `StaffManagement.tsx` | 605 | `StaffList`, `StaffForm`, `StaffScheduleEditor`, `StaffBlockManager` |
| `StaffSchedulePage.tsx` | 565 | `ScheduleCalendar`, `ScheduleEditor`, `BlockList` |

### F5: Caching Strategy

| Data | Cache Strategy | Revalidation |
|------|---------------|--------------|
| Business profile + services | `unstable_cache` with tag `business-{slug}` | On business update |
| Creator profile | `unstable_cache` with tag `creator-{slug}` | On creator update |
| Homepage business list | `unstable_cache` with tag `businesses` | On any business create/update |
| Availability slots | No cache (real-time) | N/A |
| Dashboard data | `unstable_cache` with tag `dashboard-{slug}` | On booking create/update |
| Bookings for date | `unstable_cache` with tag `bookings-{businessId}` | On booking mutation |

### F6: Error & Loading States

| Route Segment | `loading.tsx` | `error.tsx` |
|---------------|--------------|-------------|
| `(public)/[creator]/[shop]` | Booking page skeleton | "Business not found" recovery |
| `(dashboard)/dashboard/business/[slug]` | Dashboard skeleton with tab placeholders | Retry + fallback |
| `(dashboard)/dashboard/creator/[slug]` | Creator dashboard skeleton | Retry + fallback |
| `(dashboard)/bookings` | Booking list skeleton | Empty state + retry |
| `(auth)/login` | Spinner | Auth error message |

### F7: Validation Schemas

```typescript
// validation/booking.schema.ts
import { z } from 'zod'

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid(),
  linkId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
})

// validation/business.schema.ts
export const createBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(1),
  location: z.string().min(1),
  description: z.string().max(500).default(''),
  email: z.string().email().optional(),
  services: z.array(z.object({
    name: z.string().min(1),
    description: z.string().default(''),
    duration: z.number().int().min(15).max(480),
    price: z.number().min(0),
  })).min(1, 'At least one service required'),
  openingHours: z.record(z.string()).optional(),
  contactPhone: z.string().optional(),
  contactWhatsapp: z.string().optional(),
  contactLine: z.string().optional(),
})
```

### F8: UI & Aesthetic Overhaul

**Philosophy:** Keep the existing brand identity (rose + stone warmth, Inter font, rounded aesthetic) but elevate every screen to an impeccable, cohesive standard. The app should feel like it was designed by a professional design team, not assembled ad-hoc. Use the **taste skill** for design judgment and the **impeccable UI skill** for pixel-level execution.

#### Current State & Problems

| Issue | Example | Impact |
|-------|---------|--------|
| No shared primitives | Buttons styled inline across 20+ components with slight variations | Visual inconsistency, maintenance burden |
| Inconsistent spacing | Some sections use `mt-4`, others `mt-6`, `gap-2` vs `gap-3` arbitrarily | Layout feels unpolished |
| Typography soup | 12 different font sizes including custom `text-[9px]`, `text-[10px]`, `text-[11px]` | No clear hierarchy scale |
| Icon sizing varies | `size={11}` to `size={28}` with no systematic scale | Visual noise |
| Status colors duplicated | `bg-green-50 text-green-700` repeated in 6+ places | Hard to maintain, easy to diverge |
| No responsive design | Hardcoded `max-w-[480px]` everywhere — no tablet/desktop layouts | Unusable on larger screens |
| Modals vary | Different padding, border-radius, backdrop opacity across modals | Feels like different apps |
| No empty states | Missing data shows blank space or nothing | Feels broken |
| No skeleton consistency | Some pages show spinners, most show nothing while loading | Jarring experience |

#### Design System: Shared Primitives

Build a `components/ui/` library of variant-driven primitives that every screen uses:

**Button**
- Variants: `primary` (rose), `secondary` (outlined), `ghost` (text-only), `danger` (red)
- Sizes: `sm`, `md`, `lg`
- States: default, hover, active (scale), disabled, loading (spinner)
- Always `rounded-2xl`, consistent padding per size

**Card**
- Variants: `default` (white + border), `elevated` (shadow), `colored` (tinted background), `interactive` (hover state)
- Consistent `rounded-2xl`, `border-stone-100`, padding scale

**Input**
- Variants: `default`, `with-icon`, `textarea`
- Consistent height, border, focus ring (`ring-rose-500`)
- Label + error message positioning standardized

**Modal / BottomSheet**
- Consistent backdrop (`bg-black/40`)
- Consistent `rounded-t-3xl`, padding, max-height
- Close handle / close button standardized
- Entry animation: `slide-up` (always)

**Badge / StatusIndicator**
- Status map: `confirmed` → green, `pending` → amber, `cancelled` → red, `completed` → blue, `repeat` → purple
- Sizes: `sm` (inline), `md` (standalone)
- Consistent pill shape, font weight, padding

**Avatar**
- Sizes: `xs` (24px), `sm` (32px), `md` (40px), `lg` (56px)
- Initials mode (colored background) and image mode
- Consistent border-radius (full circle)

**EmptyState**
- Icon + headline + description + optional action button
- Used for: no bookings, no staff, no creators, no results

**Skeleton**
- Matching shapes for every data card (booking card skeleton, KPI skeleton, list skeleton)
- Consistent shimmer animation

#### Design Tokens (Tailwind Config Extension)

```typescript
// Formalized spacing scale (replace ad-hoc values)
spacing: {
  'section': '2rem',      // Between major page sections
  'card-padding': '1rem', // Inside cards
  'input-y': '0.75rem',   // Input vertical padding
  'input-x': '1rem',      // Input horizontal padding
}

// Typography scale (consolidate from 12+ sizes to 7)
fontSize: {
  'display':  ['2rem', { lineHeight: '1.15', fontWeight: '900' }],   // Hero headlines
  'heading':  ['1.5rem', { lineHeight: '1.2', fontWeight: '900' }],  // Page titles
  'title':    ['1.125rem', { lineHeight: '1.3', fontWeight: '700' }], // Section/card titles
  'body':     ['1rem', { lineHeight: '1.5', fontWeight: '400' }],     // Body text
  'label':    ['0.875rem', { lineHeight: '1.4', fontWeight: '600' }], // Labels, secondary
  'caption':  ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],  // Captions, metadata
  'micro':    ['0.625rem', { lineHeight: '1.3', fontWeight: '700' }], // Badges, tiny indicators
}

// Shadow scale (replace ad-hoc shadow usage)
boxShadow: {
  'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
  'modal': '0 -4px 24px rgba(0,0,0,0.12)',
  'button': '0 1px 2px rgba(0,0,0,0.05)',
}

// Border radius scale (formalize)
borderRadius: {
  'card': '1rem',      // 16px — all cards
  'button': '1rem',    // 16px — all buttons
  'input': '0.75rem',  // 12px — all inputs
  'modal': '1.5rem',   // 24px — modal top corners
  'badge': '9999px',   // Full pill
}

// Icon size scale (replace random sizes)
// xs: 14px, sm: 16px, md: 20px, lg: 24px, xl: 28px
```

#### Page-by-Page Aesthetic Targets

**Homepage (`/`)**
- Hero section: stronger visual impact with gradient overlay on featured image, not just text
- Business cards: consistent card component with photo, category badge, rating, price range
- "How it works" section: illustrated steps with subtle animation on scroll
- Footer: proper footer with links, not just end-of-page

**Booking Page (`/[creator]/[shop]`)**
- Business hero: full-bleed photo with gradient fade, not a flat colored bar
- Service cards: cleaner layout with duration + price aligned right, hover state
- Calendar: styled date picker that feels native to the brand (not browser default)
- Time slots: pill-style selection with clear available/unavailable/selected states
- Booking summary: sticky bottom bar on mobile with service + price + CTA
- Confirmation: celebration state with subtle animation (checkmark, confetti-like)

**Creator Profile (`/[creator]`)**
- Avatar section: larger, more prominent with bio
- Business cards: grid layout with cover images, not just text links
- Social links: branded platform icons with color, not generic links

**Dashboards (Business + Creator)**
- KPI cards: consistent sizing, subtle background gradients matching their meaning
- Charts/graphs: consider lightweight chart library for revenue trends (future consideration, not required for redesign)
- Booking list: clear status indicators, better use of whitespace between rows
- Tab navigation: underline indicator, not just text weight change
- Empty states for every section (no bookings, no creators, no links)

**Onboarding Flows**
- Progress indicator: step dots or progress bar at top
- Each step: single-focus layout, clear headline, supporting text
- Transitions between steps: smooth horizontal slide
- Success state: celebration with clear "what's next" CTA

**Login / Signup**
- Centered card layout with brand logo
- Single-field focus (email input prominent)
- Clear feedback on OTP sent state

#### Responsive Design Strategy

The current app is locked to `max-w-[480px]`. This redesign introduces responsive breakpoints while keeping mobile-first:

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile (default) | < 640px | Single column, bottom sheets, stacked cards |
| Tablet (`sm`) | 640-1024px | Two-column grids for cards, side-by-side form sections |
| Desktop (`lg`) | > 1024px | Sidebar navigation for dashboards, multi-column booking flow |

Public pages (booking, creator profile) should look excellent at all breakpoints since they're the first thing consumers see. Dashboard pages can start mobile-only and add responsive layouts in a later pass.

#### Micro-Interactions & Transitions

| Element | Current | Target |
|---------|---------|--------|
| Page transitions | None (hard cut) | Fade transition between route segments |
| Card hover | None or basic color change | Subtle lift (`translateY(-2px)` + shadow increase) |
| Button press | `scale-[0.98]` (good) | Keep, standardize across all buttons |
| Modal enter | `slide-up` (good) | Keep, add backdrop blur option |
| Status change | Instant | Brief color flash + transition |
| Form submission | Loading spinner | Skeleton placeholder of result + optimistic update |
| Step transition | Instant | Horizontal slide between wizard steps |
| Empty → populated | Instant | Fade-in with stagger on list items |

---

## 8. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js (App Router) | 15.3.x | Full-stack React framework |
| Runtime | React | 19.x | UI library |
| Language | TypeScript | 5.4.x | Type safety |
| Database | PostgreSQL via Supabase | latest | Data persistence + auth |
| Auth | Supabase Auth | SSR 0.10.x | Email OTP authentication |
| Payments | Stripe + Stripe Connect | 22.x | Checkout, destination charges |
| Validation | Zod | 3.x | Runtime schema validation |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| Icons | Lucide React | 0.474.x | Icon library |
| Testing | Vitest | 3.x | Unit + integration tests |
| Testing (UI) | React Testing Library | 16.x | Component tests |
| Monorepo | npm workspaces | - | Package management |

### Dependencies to Add
- `zod` — input validation at all boundaries
- `vitest` — test runner (Vite-native, fast)
- `@testing-library/react` — component testing
- `@testing-library/jest-dom` — DOM assertions
- `framer-motion` — purposeful micro-interactions, page transitions, step animations (lightweight, tree-shakeable)
- `clsx` + `tailwind-merge` — clean conditional class composition for shared UI primitives

### Dependencies to Remove
- `apps/api/` entire package (Fastify, @fastify/cors, tsx) — consolidating to Next.js only

---

## 9. Security & Configuration

### Authentication
- **Method:** Supabase Auth with email OTP (unchanged)
- **Session management:** Server middleware refreshes session cookies on every request (current `middleware.ts`)
- **Role resolution:** `getCurrentUser()` in `lib/auth.ts` — queries creators, businesses, consumers tables in sequence

### Authorization (Improvement)
- Server Actions must validate the current user owns the resource being mutated
- Add ownership checks: `assertBusinessOwner(slug)`, `assertCreatorOwner(slug)`
- Dashboard pages already guard with auth redirects; formalize this in the `(dashboard)` layout
- Booking status changes (confirm, decline, cancel) must verify the caller owns the business that owns the booking
- Staff management actions must verify the caller owns the business that employs the staff
- Link approval/decline must verify the caller owns the target business

### Input Validation
- All Server Actions validate with Zod before processing
- Stripe webhooks verify signature with `stripe.webhooks.constructEvent()`
- API routes that remain validate with Zod schemas
- All user-supplied strings are trimmed and length-bounded to prevent storage abuse
- UUIDs validated at the boundary (Zod `.uuid()`) — no raw string lookups

### Payment Security (Stripe)

This section covers security for the full payment lifecycle: checkout, webhook processing, destination charges, and commission payouts.

#### Checkout Integrity
- [ ] **Server-side price resolution** — The checkout route already looks up `service.price` from the database rather than trusting client-submitted amounts. This must remain the pattern: the client sends `serviceId`, the server resolves the price. Never accept a price from the client.
- [ ] **Booking-session binding** — Each checkout session is bound to a pre-created booking via `metadata.booking_id`. Verify on webhook receipt that the booking exists and is still in `pending` status before confirming — prevents double-confirmation or confirmation of cancelled bookings.
- [ ] **Session expiry cleanup** — Handle `checkout.session.expired` events to mark abandoned bookings as `cancelled` and release any held time slots (already implemented, verify it stays in place).
- [ ] **Checkout URL origin validation** — The `success_url` and `cancel_url` are constructed from the request `origin` header. Pin these to `NEXT_PUBLIC_SITE_URL` to prevent open-redirect attacks via spoofed origin headers.

#### Webhook Security
- [ ] **Signature verification** — Already implemented via `stripe.webhooks.constructEvent()`. Must remain — never process a webhook without verifying the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`.
- [ ] **Idempotency** — Stripe may deliver the same event multiple times. The webhook handler must be idempotent: re-confirming an already-confirmed booking should be a no-op, not an error or duplicate attribution event. Add a check: if `booking.status === 'confirmed'`, return early.
- [ ] **Event type allowlist** — Only process expected event types (`checkout.session.completed`, `checkout.session.expired`). Ignore all others gracefully (return 200, don't process). The current handler already does this implicitly, but make it explicit.
- [ ] **Webhook endpoint protection** — The `/api/webhooks/stripe` route must not require authentication (Stripe calls it externally), but it must reject requests without a valid signature. Ensure middleware does not interfere with this route (the current session-refresh middleware is safe since it doesn't block unauthenticated requests).

#### Destination Charges & Connect
- [ ] **Application fee consistency** — The platform fee (5%) is calculated server-side via `calculatePlatformFee()`. Ensure this function is the single source of truth — no duplicated fee logic elsewhere.
- [ ] **Connected account validation** — Before creating a destination charge, verify the business's `stripe_account_id` is a valid, active Stripe Express account. Handle cases where the account has been deactivated or has pending requirements.
- [ ] **Fallback charge handling** — When a business has no connected account, the current fallback charges the platform directly. Track these via metadata (`no_connected_account: 'true'`) so they can be reconciled and manually transferred later. Consider adding an admin alert or dashboard indicator for unlinked payments.

#### Commission & Attribution Integrity
- [ ] **Server-side commission calculation** — Commission rates (10% first booking, 5% repeat) must be resolved server-side in `AttributionService` and written to the booking record at creation time. Never trust client-supplied commission rates.
- [ ] **Attribution immutability** — Once a booking is confirmed and attributed, the `link_id`, `acquisition_id`, `is_repeat`, and `commission_rate` fields should not be editable via any API or Server Action. These are financial records.
- [ ] **Acquisition window enforcement** — The 6-month attribution window (`customer_acquisitions.expires_at`) must be checked server-side. Ensure `findActiveAcquisition()` correctly marks expired rows as inactive and does not attribute repeat commissions past the window.
- [ ] **Phone normalization consistency** — Attribution relies on phone number matching. The `normalizePhone()` function must be applied consistently at every entry point (booking creation, acquisition creation, acquisition lookup) to prevent mismatches from formatting differences.

#### Data Protection
- [ ] **PCI compliance** — BRIDGE never handles raw card numbers. All payment data flows through Stripe Checkout (hosted page) or Stripe Elements. No card data touches our servers. This must remain the architecture — never add a custom card form that submits to our API.
- [ ] **Sensitive field exposure** — API responses and Server Action return values must never include `stripe_account_id`, `stripe_payment_intent_id`, or `stripe_session_id` in client-facing payloads. These are internal-only fields. Audit all response shapes.
- [ ] **Customer PII handling** — Customer phone numbers and emails are stored for booking and attribution purposes. Ensure these are only accessible to the business that owns the booking, not to other businesses or creators. Creators see aggregated attribution data, not individual customer details.
- [ ] **Webhook payload logging** — Do not log full webhook payloads in production (they contain payment details). Log only event type, event ID, and booking ID for debugging.

#### Rate Limiting & Abuse Prevention
- [ ] **Checkout rate limiting** — Add rate limiting to `POST /api/checkout` to prevent automated booking attacks (e.g., exhausting all time slots). Recommended: 10 requests per minute per IP, or per authenticated user.
- [ ] **Click tracking rate limiting** — Add rate limiting to `POST /api/links/[id]/click` to prevent click-count inflation by malicious creators. Recommended: 1 click per IP per link per 5 minutes, with deduplication.
- [ ] **Booking creation throttle** — Prevent a single user from creating many pending bookings simultaneously (slot exhaustion attack). Limit to 3 pending bookings per customer email at any time.

#### Supabase Security
- [ ] **Service role key isolation** — The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and has full database access. It must only be used in server-side code (Server Actions, API routes, server components). Verify it never appears in client bundles — the `NEXT_PUBLIC_` prefix convention helps, but audit the actual usage.
- [ ] **Row-Level Security (RLS)** — Currently not implemented. As a defense-in-depth measure, add RLS policies so that even if the service role key is compromised, database access is scoped:
  - Businesses can only read/write their own bookings, staff, and services
  - Creators can only read/write their own links and view attributed bookings (not customer PII)
  - Consumers can only read their own bookings
  - Note: RLS is listed as Phase 4 / future hardening, not a blocker for the redesign

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin access (never expose to client) |
| `STRIPE_SECRET_KEY` | For payments | Stripe API key (server-only) |
| `STRIPE_WEBHOOK_SECRET` | For payments | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For payments | Client-side Stripe (safe to expose) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical site URL (used for checkout redirect URLs) |

### Security Out of Scope (Future Hardening)
- Content Security Policy (CSP) headers
- Subresource Integrity (SRI) for third-party scripts
- Stripe Radar (advanced fraud detection) — evaluate once transaction volume justifies cost
- SOC 2 compliance documentation
- GDPR data deletion flows (right to be forgotten)

---

## 10. API Specification (Post-Redesign)

Only 4 API routes remain after migration to Server Actions:

### `POST /api/webhooks/stripe`
Handles Stripe payment events. Cannot be a Server Action (requires raw body for signature verification).

**Events handled:**
- `checkout.session.completed` — mark booking confirmed, record attribution
- `checkout.session.expired` — mark booking cancelled

### `POST /api/checkout`
Creates a Stripe Checkout Session. Stays as API route because it returns a Stripe URL for client redirect.

**Request:**
```json
{
  "serviceId": "uuid",
  "businessId": "uuid",
  "linkId": "uuid | null",
  "staffId": "uuid | null",
  "customerName": "string",
  "customerEmail": "string",
  "customerPhone": "string | null",
  "bookingDate": "YYYY-MM-DD",
  "bookingTime": "HH:MM"
}
```

**Response:**
```json
{ "mode": "stripe", "url": "https://checkout.stripe.com/...", "sessionId": "cs_..." }
```

### `POST /api/links/[id]/click`
Records a link click event. Stays as API route because it's called from client-side tracking scripts (fire-and-forget).

### `GET /api/businesses/[slug]/availability`
Returns available time slots. Stays as API route because it's polled from client components for real-time updates.

**Query params:** `date` (required), `serviceId`, `staffId`

**Response:**
```json
{
  "date": "2026-05-15",
  "closed": false,
  "hours": "09:00-20:00",
  "groups": [
    { "label": "Morning", "slots": [{ "time": "09:00", "available": true }] }
  ]
}
```

All other mutations become Server Actions (see F3 in Features section).

---

## 11. Success Criteria

### MVP Success Definition
The redesign is complete when a developer can add a new feature (e.g., booking cancellation with refund) by:
1. Adding a Zod schema in `validation/`
2. Adding a service function in `services/`
3. Adding a repository method in `repositories/`
4. Adding a Server Action in `actions/`
5. Updating the relevant component

...without touching unrelated files, and with test coverage on the service function.

### Functional Requirements
- [ ] All existing features work identically after redesign (no regressions)
- [ ] Booking flow (browse → select → pay → confirm) works end-to-end
- [ ] Creator attribution (first-time 10%, repeat 5%) calculates correctly
- [ ] Business and creator dashboards display accurate data
- [ ] Staff scheduling and auto-assignment work correctly
- [ ] Stripe checkout + webhook flow processes payments
- [ ] Walk-in bookings can be created from dashboard
- [ ] Onboarding flows for creators and businesses work

### Quality Indicators — Code
- [ ] No file over 300 lines (components) or 200 lines (services/repos)
- [ ] Zero `any` types in production code
- [ ] All external inputs validated with Zod
- [ ] Test coverage on all service layer functions
- [ ] Every route segment with async data has `loading.tsx` and `error.tsx`
- [ ] Lighthouse performance score > 90 on public booking page

### Quality Indicators — Security & Payments
- [ ] All mutations (Server Actions + API routes) verify ownership before executing — no business can modify another business's bookings, staff, or links
- [ ] Stripe webhook handler is idempotent — duplicate event delivery does not cause duplicate bookings, attribution events, or status changes
- [ ] Checkout prices are always resolved server-side from the database — never from client-submitted values
- [ ] Attribution fields on confirmed bookings are immutable — no endpoint allows modification of `link_id`, `commission_rate`, `is_repeat`, or `acquisition_id`
- [ ] No Stripe secret keys or Supabase service role keys appear in client JavaScript bundles
- [ ] No customer PII (phone, email) is exposed to users other than the business that owns the booking
- [ ] Rate limiting is active on checkout and click-tracking endpoints
- [ ] All checkout redirect URLs are pinned to the app's configured domain

### Quality Indicators — UI & Aesthetic
- [ ] All interactive elements (buttons, inputs, modals, badges) use shared `components/ui/` primitives — zero inline-styled one-offs
- [ ] Typography uses only the 7-level scale defined in design tokens — no arbitrary `text-[Xpx]` values remain
- [ ] Spacing uses only the formalized scale — no arbitrary margin/padding values
- [ ] Every list/section has a designed empty state (icon + message + action)
- [ ] Every async section has a matching skeleton loader (shaped to the content it replaces)
- [ ] Status colors are centralized in the Badge/StatusIndicator component — not duplicated inline
- [ ] Public pages (home, booking, creator profile) are responsive at mobile, tablet, and desktop
- [ ] All screens pass a cohesion check: a user navigating between pages should feel they are in the same app
- [ ] Micro-interactions (hover, press, transitions) are consistent across all interactive elements

### User Experience Goals
- [ ] Public pages (creator profile, booking page) show content within 1s (streaming)
- [ ] Form submissions show immediate feedback (pending states via `useFormStatus`)
- [ ] Errors are recoverable (retry buttons, not blank screens)
- [ ] Dashboard loads with skeleton UI, not a white flash
- [ ] Booking wizard step transitions feel smooth and guided (animated, not jarring cuts)
- [ ] Onboarding flows feel premium — clear progress, focused steps, celebration at completion
- [ ] The app looks trustworthy to a first-time consumer — professional enough to enter payment details

---

## 12. Implementation Phases

### Phase 1: Foundation + Design System (Week 1-2)

**Goal:** Set up the new layered architecture and the shared design system in parallel. Migrate the most critical code path (booking + attribution) and build the UI primitives that every subsequent phase will use.

**Deliverables — Architecture:**
- [ ] Create `repositories/` directory with typed repo modules extracted from `db.ts`
- [ ] Create `services/` directory; migrate booking + attribution logic
- [ ] Create `validation/` directory with Zod schemas for booking and checkout
- [ ] Create `actions/` directory; convert booking status updates to Server Actions
- [ ] Set up Vitest; write tests for `BookingService` and `AttributionService`
- [ ] Refactor `api/checkout/route.ts` to call `CheckoutService`
- [ ] Remove `apps/api/` (Fastify backend)

**Deliverables — Design System:**
- [ ] Extend `tailwind.config.ts` with formalized design tokens (typography scale, spacing scale, shadow scale, border-radius scale)
- [ ] Build `components/ui/` shared primitives: `Button`, `Card`, `Input`, `Badge`, `Avatar`, `EmptyState`, `Skeleton`
- [ ] Build `components/ui/Modal.tsx` (standardized bottom sheet)
- [ ] Install `clsx` + `tailwind-merge` for class composition; `framer-motion` for transitions
- [ ] Create a `/dev/components` page (dev-only) showing all primitives with variants for visual QA

**Validation:**
- Booking flow works end-to-end (manual test)
- Attribution calculates correctly (unit tests pass)
- Checkout creates Stripe session and processes webhook
- No TypeScript errors
- All UI primitives render correctly on the dev components page

### Phase 2: Full Migration + Public Pages Redesign (Week 3-4)

**Goal:** Migrate all remaining business logic to the service layer, convert all eligible API routes to Server Actions, and redesign the consumer-facing pages using the new design system.

**Deliverables — Architecture:**
- [ ] Migrate `availability.ts` → `services/availability.service.ts` + `repositories/` calls
- [ ] Migrate staff management logic → `services/staff.service.ts`
- [ ] Migrate creator/business CRUD → respective services
- [ ] Migrate dashboard aggregation → `services/dashboard.service.ts`
- [ ] Convert remaining API routes to Server Actions (see F3 table)
- [ ] Delete old `db.ts` (all logic migrated)
- [ ] Consolidate types into `packages/shared` (delete `lib/types.ts`)
- [ ] Add Zod schemas for all remaining inputs
- [ ] Write tests for all service functions

**Deliverables — UI Redesign (Public Pages):**
- [ ] Redesign homepage: hero section with visual impact, polished business cards, "how it works" section
- [ ] Redesign booking page (`/[creator]/[shop]`): full-bleed business hero, cleaner service cards, styled date/time pickers, sticky booking summary bar, confirmation celebration state
- [ ] Redesign creator profile (`/[creator]`): prominent avatar + bio, business grid with cover images, branded social links
- [ ] Redesign login/signup: centered brand card, clean OTP flow
- [ ] Migrate all public pages to use shared UI primitives (Button, Card, Badge, etc.)
- [ ] Add responsive breakpoints for public pages (tablet + desktop layouts)
- [ ] Add step-transition animations for booking wizard (horizontal slide between steps)

**Validation:**
- All dashboards render correctly
- Staff scheduling works
- Creator and business onboarding works
- Zero `any` types remaining
- All service tests pass
- Public pages look polished at mobile, tablet, and desktop widths
- Booking flow feels smooth with transitions between steps

### Phase 3: Dashboard Redesign + Performance (Week 5-6)

**Goal:** Redesign dashboard and internal pages, split oversized components, add Suspense/streaming, caching, and error boundaries.

**Deliverables — Component Decomposition:**
- [ ] Split `ShopBookingPage` into 6+ focused components (already restyled in Phase 2, now decompose)
- [ ] Split `CreatorOnboarding` and `BusinessOnboarding` into step components
- [ ] Split `StaffManagement` and `StaffSchedulePage`

**Deliverables — Dashboard & Internal UI Redesign:**
- [ ] Redesign business dashboard: polished KPI cards, clean booking list with status badges, improved tab navigation with underline indicator, creator rollup section
- [ ] Redesign creator dashboard: earnings overview with clear hierarchy, link performance cards with cover images, activity feed
- [ ] Redesign onboarding flows: progress indicator (step dots/bar), single-focus per step, celebration success state
- [ ] Redesign staff management: cleaner list/grid, inline schedule editor, visual block calendar
- [ ] Add empty states for every list/section (no bookings, no creators, no links, no staff)
- [ ] Add consistent skeleton loading states matching each card/section shape
- [ ] Migrate all dashboard/internal pages to shared UI primitives

**Deliverables — Performance:**
- [ ] Add `loading.tsx` skeletons for all route segments
- [ ] Add `error.tsx` boundaries for all route segments
- [ ] Implement `unstable_cache` + `revalidateTag` strategy (see F5)
- [ ] Add route groups: `(public)`, `(auth)`, `(dashboard)`
- [ ] Add `useFormStatus` pending states to all Server Action forms
- [ ] Component tests for BookingWizard, onboarding flows
- [ ] Add card hover micro-interactions (subtle lift + shadow)
- [ ] Add fade/stagger animations for list population

**Validation:**
- No component file over 300 lines
- Lighthouse performance > 90 on `/[creator]/[shop]`
- All loading/error states visible (test by throttling network)
- Cache invalidation works (book → dashboard updates)
- Dashboards look cohesive with public pages — same design language
- Every empty state has an illustration/icon + message + action

### Phase 4: Polish & Hardening (Week 7-8)

**Goal:** Test coverage, authorization hardening, seed data cleanup, final UI polish pass, and documentation.

**Deliverables — Architecture:**
- [ ] Add ownership assertions to all Server Actions (`assertBusinessOwner`, etc.)
- [ ] Isolate seed data into a dev-only provider (remove from production code paths)
- [ ] Integration tests for full booking flow (service → checkout → webhook → dashboard)
- [ ] Integration tests for attribution edge cases (repeat, expired window, no phone)
- [ ] E2E smoke test for critical paths (optional: Playwright)
- [ ] Update `packages/shared` types to match final schema
- [ ] Clean up unused exports, dead code paths
- [ ] Update CLAUDE.md with new architecture documentation

**Deliverables — Payment & Security Hardening:**
- [ ] Add idempotency to Stripe webhook handler (skip already-confirmed bookings)
- [ ] Pin checkout `success_url` / `cancel_url` to `NEXT_PUBLIC_SITE_URL` (prevent open redirect)
- [ ] Add rate limiting to `/api/checkout` and `/api/links/[id]/click`
- [ ] Add pending booking limit per customer email (prevent slot exhaustion)
- [ ] Audit all API responses and Server Action return values — strip `stripe_account_id`, `stripe_payment_intent_id`, and other internal fields from client payloads
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` never appears in client bundles (grep build output)
- [ ] Mark attribution fields (`link_id`, `commission_rate`, `is_repeat`, `acquisition_id`) as immutable — no Server Action or API route allows editing them post-confirmation
- [ ] Add connected account status check before creating destination charges
- [ ] Integration tests for webhook idempotency (double-delivery), expired session cleanup, and attribution immutability

**Deliverables — UI Final Polish:**
- [ ] Full cross-screen audit: verify every page uses the shared design tokens and UI primitives consistently (use **impeccable UI skill** for pixel-level review)
- [ ] Use **taste skill** for design judgment calls — visual hierarchy, whitespace, color balance, information density per screen
- [ ] Audit typography: confirm all text uses the 7-level type scale (no remaining arbitrary `text-[Xpx]` values)
- [ ] Audit spacing: confirm all gaps/margins use the formalized spacing scale (no remaining arbitrary values)
- [ ] Verify responsive layouts at mobile (375px), tablet (768px), and desktop (1280px) widths
- [ ] Verify all interactive elements have visible focus states (keyboard accessibility)
- [ ] Verify all status colors are sourced from the shared `Badge`/`StatusIndicator` component (no inline color duplication)
- [ ] Final animation pass: ensure transitions feel intentional, not distracting — consistent timing and easing
- [ ] Remove the `/dev/components` page from production build (dev-only)

**Validation:**
- All tests pass (including webhook idempotency and attribution immutability tests)
- No seed data logic in production bundles
- Authorization prevents cross-tenant access
- Clean TypeScript build with zero warnings
- Full-app screenshot walkthrough at 3 breakpoints shows visual cohesion
- No remaining ad-hoc Tailwind classes that bypass the design token system
- Zero inline color/spacing/typography values that aren't from the design token scale
- `grep` of build output confirms no service role key or Stripe secret key in client bundles
- Webhook double-delivery does not create duplicate attribution events
- Checkout redirect URLs resolve only to the app's own domain

---

## 13. Future Considerations

### Post-Redesign Enhancements
- **Email notifications** — Booking confirmations, reminders (Resend integration). The service layer makes this easy: add a `NotificationService.bookingConfirmed()` call in `BookingService.create()`.
- **Review/rating system** — New `reviews` table, `ReviewService`, `ReviewRepo`. Fits cleanly into the new architecture.
- **Cancellation policies** — Business-configurable cancellation windows with refund rules. Add to `CheckoutService` and `BookingService`.
- **Multi-location support** — Businesses with multiple addresses. Repository change + service logic for location-aware availability.

### Performance Optimizations
- **Parallel data fetching** — Use `Promise.all` in server components for independent queries (partially done, can be extended).
- **React Server Component streaming** — Already enabled by Suspense boundaries in Phase 3.
- **Edge runtime** — Move public pages to Edge Runtime for faster TTFB (evaluate Supabase Edge compatibility).
- **Image optimization** — Use Next.js `<Image>` component for business photos (currently using raw `<img>`).

### Infrastructure
- **CI/CD** — GitHub Actions for lint + type-check + test on PRs.
- **Monitoring** — Sentry for error tracking, Vercel Analytics for performance.
- **Database** — RLS policies for defense-in-depth; Supabase Realtime for live booking updates.

---

## 14. Risks & Mitigations

### Risk 1: Regression during migration
**Impact:** High — breaking the booking or payment flow loses revenue.
**Mitigation:** Phase 1 focuses on the critical path (booking + checkout + attribution) and adds tests before migrating. Each phase validates that existing features still work. Never delete old code until new code is tested.

### Risk 2: Server Actions learning curve
**Impact:** Medium — unfamiliar patterns could lead to misuse.
**Mitigation:** Start with simple CRUD actions (booking status update) before tackling complex flows. Keep the checkout flow as an API route where it's better suited.

### Risk 3: Over-engineering the abstraction layers
**Impact:** Medium — creating too many files/layers slows development instead of helping.
**Mitigation:** Strict rule: if a service function is just a passthrough to the repo, inline it. The service layer exists for functions that orchestrate multiple repos or contain business logic. A repo that's called from only one place can start as a direct Supabase call and be extracted later.

### Risk 4: Cache invalidation bugs
**Impact:** Medium — stale data in dashboards or availability.
**Mitigation:** Availability stays uncached (real-time). Dashboard data uses `revalidateTag` tied to mutations in the same Server Action. Start with shorter cache times and extend once validated.

### Risk 5: Seed data entanglement
**Impact:** Low — seed data fallbacks are woven throughout `db.ts`, making it hard to extract cleanly.
**Mitigation:** Phase 1 repositories ignore seed data (Supabase-only). Phase 4 wraps seed data in a dev provider that's tree-shaken from production builds. Don't block the migration on seed data cleanup.

### Risk 6: UI redesign scope creep
**Impact:** Medium — aesthetic work is subjective and can expand indefinitely ("just one more tweak").
**Mitigation:** Phase 1 builds the design system and tokens first — this constrains all future UI work to the defined system. Page redesigns in Phases 2-3 use only the established primitives and tokens. Phase 4 is a final audit pass, not a redesign. If a screen doesn't look right, the fix should be adjusting the design token or primitive — not adding one-off styles. The **taste skill** provides opinionated design judgment to avoid endless iteration; the **impeccable UI skill** provides a concrete quality bar to hit.

### Risk 7: Architecture + UI in parallel overwhelms velocity
**Impact:** Medium — doing both a code restructure and visual overhaul simultaneously could slow both down.
**Mitigation:** Phase 1 intentionally separates the two workstreams (architecture deliverables vs. design system deliverables) so they can be worked on independently. The design system (Phase 1) is a prerequisite for page redesigns (Phases 2-3), but not for architecture work. If timeline pressure hits, architecture takes priority — the design system and page redesigns can shift by a phase without blocking each other.

---

## 15. Appendix

### Current Codebase Metrics

| Metric | Value |
|--------|-------|
| Total TypeScript/TSX files | 67 |
| Total lines (web/src) | ~9,600 |
| Largest file | `lib/db.ts` (2,041 lines) |
| Largest component | `ShopBookingPage.tsx` (1,389 lines) |
| API route count | 21 files |
| `any` type occurrences | 40+ |
| Test files | 0 |
| `loading.tsx` files | 0 |
| `error.tsx` files | 0 |
| Database tables | 12 |
| Database migrations | 5 |

### Current UI Metrics

| Metric | Value |
|--------|-------|
| Shared UI primitives (`components/ui/`) | 0 |
| Distinct font sizes used | 12+ (including custom `text-[9px]`, `text-[10px]`, `text-[11px]`) |
| Components with `'use client'` | 21 |
| Components over 500 lines | 5 |
| Responsive breakpoints used | 0 (hardcoded `max-w-[480px]`) |
| Empty state components | 0 |
| Skeleton/loading components | 0 |
| Inline button style variations | 6+ distinct patterns |
| Inline modal style variations | 4+ distinct patterns |
| Status color definitions (duplicated) | 5+ colors repeated across 6+ files |

### Key Files Reference
- Data access layer: `apps/web/src/lib/db.ts`
- Availability engine: `apps/web/src/lib/availability.ts`
- Auth/role resolution: `apps/web/src/lib/auth.ts`
- Type definitions: `apps/web/src/lib/types.ts` + `packages/shared/src/types.ts`
- Commission constants: `apps/web/src/lib/constants.ts`
- Database schema: `packages/db/migrations/`
- Shared types: `packages/shared/src/`
