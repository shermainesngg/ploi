# BRIDGE UI/UX Redesign — Product Requirements Document

> **Scope**: Visual and UX redesign only. The architecture redesign (service layer, repositories, Server Actions) is already complete per `PRD.md`. This PRD covers the frontend facelift: new brand colors, refined design tokens, page-by-page visual overhaul, and mobile UX polish.

---

## 1. Executive Summary

BRIDGE is a creator-to-commerce booking platform connecting social media creators with local beauty & wellness businesses in Bangkok. The platform's layered architecture (Server Actions → Services → Repositories → Supabase) is already in place and working. What remains is elevating the visual design from "functional MVP" to "polished consumer product."

The current UI uses a terracotta/stone palette (`#c05636`), has a solid design token system (CSS custom properties → Tailwind), and working UI primitives (Button, Card, Input, Modal, Badge, Avatar). But it doesn't yet feel like the premium booking experience we're competing against.

**Design Vision**: BRIDGE should feel like the love child of ClassPass (clean booking UX), Instagram (creator social layer), and Klook (service discovery).

**What's Changing**: Brand color from terracotta to BRIDGE red (#DC2751). Warm pink-to-orange gradients for hero sections. Bolder typography hierarchy. More prominent creator social proof. Refined card/shadow/spacing polish across every page.

**What's NOT Changing**: Backend, API routes, database, business logic, component architecture, authentication, payments. This is a CSS/JSX-only effort.

---

## 2. Mission

**Redesign Mission**: Make every screen look intentionally designed — trustworthy enough that a first-time customer enters their card details, professional enough that a business owner switches from their paper diary, and premium enough that a creator is proud to share their profile link.

**Core Principles**:

1. **Mobile-first, always.** Every page must work beautifully on a phone. Desktop is secondary.
2. **Speed over spectacle.** Shop Booking Page must load fast. Minimal JS, no heavy animations.
3. **The Discovery Loop is sacred.** Every page leads to another: Business → Creator → Other Businesses → repeat.
4. **Creator prominence.** Creators are the trust layer — visible and prominent, never buried.
5. **Token-driven consistency.** Every color, spacing, and font size comes from the design token system. Zero one-off values.

---

## 3. Target Users

### Customer (Primary — this redesign is mostly for them)
- 20-35 year old in Bangkok, arrives via TikTok/Instagram link from a creator they follow
- High mobile fluency — expects ClassPass/Klook-level booking UX
- Needs to feel trust immediately: "Is this legit? Should I enter my card?"
- First impression is the Shop Booking Page — it must convert

### Creator
- Bangkok-based beauty/wellness micro-influencer (1K-100K followers)
- Shares their BRIDGE profile link in bio — it needs to look premium
- Checks their dashboard for earnings — it needs to feel like a real analytics tool
- Proud to screenshot their BRIDGE stats

### Business Owner
- Bangkok salon/spa/studio owner or manager
- Uses BRIDGE dashboard for daily scheduling — needs Fresha/Booksy level calendar UX
- May currently use paper diary — the dashboard must be simpler, not more complex

---

## 4. MVP Scope

### In Scope: Visual/UX Only

**Design System Token Updates**
- [ ] Primary accent: `#c05636` (terracotta) → `#DC2751` (BRIDGE red)
- [ ] Derive new light/dark/soft/wash variants for the red
- [ ] Add gradient tokens for hero backgrounds (pink-to-orange warm gradient)
- [ ] Refine card shadows for slightly more depth
- [ ] Update dark mode variants for all changed tokens
- [ ] Decide: merge `--bridge-pop` (#d63031) with new accent, or keep separate

**Shop Booking Page (Highest Priority)**
- [ ] Hero: polish gradient overlay, trust signals more prominent
- [ ] Creator chips: Instagram Stories-style circles — prominent, not buried in a collapsible
- [ ] Service cards: refined price/duration/Book layout with new card styling
- [ ] Sticky Book Now: BRIDGE red, stronger shadow
- [ ] Content-first hero: polish featured service card when arriving via creator link
- [ ] About section: visual refinement with new colors
- [ ] Booking modal: polish date picker, time slots, details form, confirmed screen

**Creator Profile Page**
- [ ] Hero: Linktree-style — profile photo, handle, bio, social platform pill buttons
- [ ] Content grid: refined card styling with new shadows
- [ ] Stats badges: updated colors
- [ ] Discovery Loop: verify every card links through correctly

**Business Dashboard**
- [ ] Header: update gradient/brand colors
- [ ] Tab nav: update active/inactive styling with new brand colors
- [ ] Calendar views: refined color-coding with new palette
- [ ] Booking actions: clearer button hierarchy for confirm/decline/reschedule/etc.
- [ ] Stripe connect prompt: update styling

**Creator Dashboard**
- [ ] Header: update from dark background to new brand colors
- [ ] KPI cards: update accent colors
- [ ] Earnings split cards: update to new palette
- [ ] Link performance cards: update status badge colors
- [ ] Activity feed: update icon/accent colors

**Landing Page**
- [ ] Hero: update CTAs and accent color
- [ ] Featured cards: new card styling
- [ ] How-it-works: update accent markers
- [ ] CTA sections: new button colors
- [ ] Footer: update brand accent

**Auth & Onboarding**
- [ ] Login/Signup: update accent colors
- [ ] Business onboarding: update styling throughout
- [ ] Creator onboarding: update styling throughout

**Global**
- [ ] NavBar: update brand colors
- [ ] Booking confirmed page: update accent colors
- [ ] BookingsList (customer history): update styling

### Out of Scope
- [ ] Backend/API changes of any kind
- [ ] New features (search, filters, reviews, messaging, maps embed)
- [ ] New pages or routes
- [ ] Database or migration changes
- [ ] Authentication flow changes
- [ ] Payment flow changes
- [ ] Component architecture refactoring (splitting large components)
- [ ] New npm dependencies
- [ ] Multi-language support
- [ ] Image upload system
- [ ] Real-time WebSocket features

---

## 5. User Stories

1. **As a customer** landing from a TikTok link, I want to immediately see the creator who recommended this place and the specific service they got, so that I feel the trust to book the same experience.

2. **As a customer** scrolling the Shop Booking Page, I want a sticky "Book Now" button in BRIDGE's brand red always visible at the bottom, so that I can start booking without scrolling back up.

3. **As a customer** considering a business, I want to see "Recommended by 5 creators" and "12 booked this week" prominently near the top, so that social proof builds my confidence.

4. **As a creator**, I want my profile page to look like a premium Linktree — clean grid of places with my content thumbnails, social platform icons, and "X places recommended" stat — so followers take my recommendations seriously.

5. **As a creator**, I want my dashboard KPI cards in bold BRIDGE red to feel like Shopify analytics, so that checking my earnings feels rewarding and professional.

6. **As a business owner**, I want my dashboard calendar with clean color-coded bookings and clear action buttons, so that I can manage my day as efficiently as with Fresha.

7. **As a visitor** on the landing page, I want the BRIDGE brand to feel modern and trustworthy with a distinctive red accent, so that I'm interested in exploring further.

---

## 6. Design Language Specification

### Color System

**Primary Accent: BRIDGE Red**
| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bridge-accent` | `#DC2751` | `#E5436B` | Primary CTAs, brand highlights, key metrics |
| `--bridge-accent-dark` | `#B81E42` | `#F06688` | Hover states, pressed buttons |
| `--bridge-accent-light` | `#F5C6D0` | `#3A1C24` | Light tints, selected backgrounds |
| `--bridge-accent-soft` | `#FDF0F3` | `#221418` | Very light wash, section backgrounds |
| `--bridge-accent-wash` | `#FAF0F2` | `#1C1215` | Subtle tint for cards, badges |

**Neutral Palette** (unchanged — the warm stone tones work well)
| Token | Light Mode | Usage |
|---|---|---|
| `--bridge-bg` | `#faf8f5` | Page background |
| `--bridge-surface` | `#f2ede7` | Elevated surface, input backgrounds |
| `--bridge-card` | `#ffffff` | Card backgrounds |
| `--bridge-border` | `#e3dbd2` | Default borders |
| `--bridge-border-strong` | `#d1c7bb` | Emphasized borders |
| `--bridge-muted` | `#8f8279` | Secondary text, icons |
| `--bridge-secondary` | `#6b5e54` | Body text (slightly more emphasis) |
| `--bridge-text` | `#3d3530` | Primary body text |
| `--bridge-heading` | `#2a2320` | Headings, bold text |

**Pop Color** — Decision needed:
- Option A: Merge `--bridge-pop` with `--bridge-accent` (since they're both red now)
- Option B: Keep `--bridge-pop` as a brighter/different red for special emphasis
- Recommendation: **Merge them.** With accent already red, having a separate pop-red creates confusion. Use accent for everything.

**Status Colors** (unchanged — functional, not brand)
| Status | Color | Usage |
|---|---|---|
| Success/Open | Green | Confirmed bookings, "Open now" |
| Warning/Pending | Amber | Pending bookings, pending link requests |
| Error/Danger | Red-600 | Declined, cancelled, error states |
| Info/Repeat | Purple | Repeat earnings, customer acquisition |

**Hero Gradients**
- Shop Booking Page hero (when no cover photo): `linear-gradient(135deg, #DC2751, #F97316)` — warm red-to-orange
- Creator Dashboard header: solid `--bridge-heading` (dark) — keeps contrast with KPI cards below
- Business Dashboard header: cover photo with gradient overlay, or brand gradient fallback

### Typography

The existing type scale is well-defined and responsive. No changes needed — just ensure the new red accent color works with the existing weights.

| Token | Size | Weight | Usage |
|---|---|---|---|
| `display` | clamp(2.25rem, 5vw, 3.25rem) | 700 | Hero headlines |
| `heading` | clamp(1.5rem, 3.5vw, 2rem) | 700 | Page titles |
| `title` | 1.25rem | 600 | Section titles, card headers |
| `body-lg` | 1.0625rem | 400 | Lead paragraphs |
| `body` | 0.9375rem | 400 | Default body text |
| `label` | 0.8125rem | 600 | Labels, button text |
| `caption` | 0.75rem | 500 | Metadata, secondary info |
| `micro` | 0.6875rem | 600 | Badges, tiny indicators |

### Spacing, Shadows, Radii

All existing tokens stay the same. The only potential tweak:

| Token | Current | Consideration |
|---|---|---|
| `--shadow-card` | `0 1px 2px rgba(42,35,32,0.04)` | May increase slightly for more visible depth |
| `--shadow-card-hover` | `0 4px 12px rgba(42,35,32,0.06)` | May increase slightly |

### Button Variants After Redesign

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| `primary` | BRIDGE red | White | None | Main CTAs (Book Now, Confirm, Save) |
| `secondary` | Transparent | Text color | Border-strong | Secondary actions (Cancel, Back) |
| `ghost` | Transparent | Secondary | None | Tertiary actions, links |
| `danger` | Red-600 | White | None | Destructive actions (Decline, Delete) |

---

## 7. Page-by-Page Specifications

### 7.1 Shop Booking Page (`/[creator]/[shop]`)

**This is the highest-priority page.** It's where conversion happens — customer lands from creator content and decides to book.

**Current State**: Already well-structured with BusinessHero, CreatorBar, CreatorsCallout, FeaturedServiceCard, ServiceCards, BookingModal, AboutSection. All components exist and work.

**What Changes**:

| Section | Current | Target |
|---|---|---|
| Hero gradient fallback | `linear-gradient(135deg, ${from}, ${to})` using business colors | Warm red-to-orange gradient when no photo |
| Hero trust signals | Small white text at bottom of hero | More prominent — slightly larger, bolder |
| Creator chips callout | Card with stacked avatars + text | Keep overall structure, update accent colors |
| Service cards | Card with left-aligned content, right-aligned price/Book | Update button to BRIDGE red |
| Featured service card | Card with accent-light border and ring | Update border and ring to new accent colors |
| Sticky Book Now | Accent button at bottom | BRIDGE red, slightly larger shadow |
| Creator Bar | Card with accent colors | Update to new red |
| Booking modal dates | Accent-colored selected state | Update to BRIDGE red |
| Booking modal times | Accent-colored selected state | Update to BRIDGE red |
| Booking modal confirmed | Accent-soft checkmark | Update to new accent colors |
| About section | Collapsible with accent links | Update accent color |
| Category badge | `bg-white/20` | Keep as-is (works on hero) |
| Price badge | `bg-white/20` | Keep as-is |

**Key UX Principles**:
- Trust signals (creator count, booking count) must be visible without scrolling
- Creator attribution bar appears immediately after hero when arriving via creator link
- Sticky Book Now is always visible — never covered by other elements
- Booking flow should feel fast: service → date → time → details → confirm

### 7.2 Creator Profile Page (`/[creator]`)

**Current State**: Clean Linktree-style layout with hero (avatar, name, bio, socials) and content grid.

**What Changes**:

| Section | Current | Target |
|---|---|---|
| Social link buttons | `bg-bridge-heading text-white` | Keep dark buttons — they work well for social links |
| Stat badges | `bg-bridge-surface text-bridge-secondary` | Keep as-is, subtle is correct here |
| Content grid cards | Card with `interactive` variant | Update accent color on price text |
| Platform badges | `bg-black/50` on thumbnails | Keep as-is — good contrast |
| "Powered by BRIDGE" | `text-bridge-accent` | Update to new red |
| Onboarding CTAs | Footer links | Update hover color |

**Key UX Principles**:
- Creator's personality should come through — the avatar and bio should feel personal
- Grid should feel like an Instagram feed of places, not a list of links
- Every card must link to the business's Shop Booking Page with creator attribution

### 7.3 Business Dashboard (`/dashboard/business/[slug]`)

**Current State**: Header with cover photo/gradient, sticky tab nav, content area with Overview/Calendar/Bookings/Creators tabs.

**What Changes**:

| Section | Current | Target |
|---|---|---|
| Dashboard badge | `bg-white/20` | Keep as-is (on hero background) |
| Tab nav active | `bg-bridge-heading text-white` | Keep — clear active state |
| Tab badges | `bg-amber-100 text-amber-800` | Keep — amber for pending is correct |
| Stripe connect prompt | `bg-bridge-heading text-white` | Keep dark card — draws attention |
| Walk-in button | `bg-bridge-accent` | Update to BRIDGE red |
| View switcher active | `bg-bridge-card text-bridge-heading shadow-card` | Keep as-is — clean |
| Staff link | `text-bridge-muted` | Keep |
| Calendar color coding | Various status colors | Ensure consistent with status color system |
| KPI cards | Bridge accent for earnings | Update accent to new red |

### 7.4 Creator Dashboard (`/dashboard/creator/[slug]`)

**Current State**: Dark header, KPI grid, pending payout card, earnings split, links, activity feed.

**What Changes**:

| Section | Current | Target |
|---|---|---|
| Header | `bg-bridge-heading` dark | Keep dark — good contrast with KPI cards |
| Back link | `text-white/60` | Keep |
| KPI grid | `bg-bridge-card` cards | Keep styling, update any accent usage |
| Pending payout card | `bg-bridge-accent` | Update to BRIDGE red |
| First booking earnings | Default card | Keep — card border is sufficient |
| Repeat earnings | `border-purple-200 bg-purple-50/30` | Keep purple — correctly differentiates from first bookings |
| Customer acquisition | Default card, `text-bridge-accent` icon | Update icon to new red |
| Add new place button | `bg-bridge-accent` | Update to BRIDGE red |
| Copy button | `text-bridge-accent bg-bridge-accent-wash` | Update to new accent tones |
| Link status badges | green/amber/muted | Keep — standard status colors |
| Stats (clicks/bookings) | `bg-bridge-bg` | Keep |
| Earned stat | `bg-bridge-accent-wash text-bridge-accent` | Update to new accent tones |
| Activity icons | `bg-bridge-accent-wash text-bridge-accent` | Update to new accent tones |
| Activity amounts | `text-bridge-accent` | Update to new red |

### 7.5 Landing Page (`/`)

**Current State**: Clean editorial layout with hero, featured places grid, how-it-works, CTA section, footer.

**What Changes**:

| Section | Current | Target |
|---|---|---|
| Hero headline accent | `text-bridge-pop` period (`.`) | Update to new accent (or remove if pop is merged) |
| Primary CTA button | `bg-bridge-accent` | Update to BRIDGE red |
| Featured section | Default cards | Update accent color on price text |
| How-it-works numbers | `text-bridge-pop` | Update to new accent |
| How-it-works divider | `bg-bridge-pop/40` | Update to new accent |
| CTA divider | `bg-bridge-pop` and `text-bridge-pop` | Update to new accent |
| Footer brand | `text-bridge-pop` period | Update to new accent |
| Category badge border | `border-bridge-pop` left border | Update to new accent |

### 7.6 Auth Pages

**Login/Signup**: Update any accent-colored elements to new BRIDGE red. The auth flow is already clean.

### 7.7 Onboarding Flows

**Business/Creator Onboarding**: Update progress indicators, CTA buttons, and accent colors to BRIDGE red. The step-by-step structure is already good.

### 7.8 Booking Confirmed Page

Update the checkmark icon color, accent highlights, and CTA button to BRIDGE red.

---

## 8. Technology Stack

**No changes.** All technologies remain:

- Next.js 15 (App Router) with React 19
- Tailwind CSS 3 with CSS custom properties
- Framer Motion for animations
- Lucide React for icons
- clsx + tailwind-merge for `cn()` utility

**No new dependencies needed.** This is purely a CSS variable + Tailwind class update across existing components.

---

## 9. Security & Configuration

**No security changes.** No new endpoints, no auth changes, no new environment variables.

The only configuration change is updating CSS custom properties in `globals.css` and verifying the Tailwind config maps correctly.

---

## 10. Success Criteria

### Visual Consistency
- [ ] All pages use BRIDGE red (#DC2751) as primary accent — zero remnants of terracotta (#c05636)
- [ ] If `--bridge-pop` is merged with `--bridge-accent`, no references to the old pop color remain
- [ ] Design token system is internally consistent — no hard-coded hex colors in component files
- [ ] Light and dark mode both work correctly on all pages

### Mobile UX
- [ ] Every page passes visual inspection at iPhone SE width (375px)
- [ ] Sticky Book Now button is always visible on Shop Booking Page
- [ ] Creator attribution bar is visible without scrolling when arriving via creator link
- [ ] Trust signals are visible without scrolling on Shop Booking Page
- [ ] Booking flow feels smooth on mobile — no awkward scrolling or overflows

### Performance
- [ ] No new JavaScript dependencies added
- [ ] Shop Booking Page load time does not increase
- [ ] No layout shifts from the color changes

### Discovery Loop
- [ ] Shop Booking Page → Creator chips → Creator Profile works
- [ ] Creator Profile → Business card → Shop Booking Page works
- [ ] Landing Page → Featured business → Shop Booking Page works
- [ ] Every "Powered by BRIDGE" link leads somewhere useful

### Brand Coherence
- [ ] A user navigating Home → Business → Creator → Dashboard feels like one cohesive app
- [ ] The BRIDGE red accent creates a distinctive, recognizable brand presence
- [ ] Hero sections feel warm and premium (not generic startup)

---

## 11. Implementation Phases

### Phase 1: Design Tokens & UI Primitives (~30 min)

**Goal**: Update the foundation so every downstream component inherits the new look automatically.

**Files to modify**:
- `apps/web/src/app/globals.css` — Update accent CSS variables
- `apps/web/tailwind.config.ts` — Verify token mappings (should auto-inherit from CSS vars)
- `apps/web/src/components/ui/Button.tsx` — Should auto-inherit, verify hover states
- `apps/web/src/components/ui/Card.tsx` — Verify no hard-coded colors
- `apps/web/src/components/ui/Input.tsx` — Verify focus ring color
- `apps/web/src/components/ui/Modal.tsx` — Verify accent usage
- `apps/web/src/components/ui/Badge.tsx` — Verify accent usage

**Validation**: Run `npm run dev`, check landing page and `/dev/components` page. The accent color should change globally. Verify dark mode.

### Phase 2: Shop Booking Page (~1-2 hours)

**Goal**: Perfect the most important conversion page.

**Files to modify**:
- `apps/web/src/components/ShopBookingPage.tsx` — All sub-components (BusinessHero, CreatorBar, CreatorsCallout, FeaturedServiceCard, ServiceCard, BookingModal, ConfirmedScreen, AboutSection)

**Validation**: 
- Navigate to `/[creator]/[shop]` on mobile viewport
- Verify: trust signals visible, creator attribution prominent, service cards clean, sticky Book Now works
- Walk through full booking flow: select service → pick date → pick time → enter details → confirm
- Test content-first hero (via creator link with featured service)
- Test creators callout expansion

### Phase 3: Creator & Public Pages (~1 hour)

**Goal**: Polish creator profile, landing page, auth pages.

**Files to modify**:
- `apps/web/src/components/CreatorProfilePage.tsx`
- `apps/web/src/app/page.tsx` (landing page)
- `apps/web/src/components/NavBar.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/booking-confirmed/[id]/page.tsx`

**Validation**:
- Navigate Discovery Loop: Landing → Business card → Creator chip → Creator profile → Business card → back
- Check login/signup pages
- Check booking confirmed page

### Phase 4: Dashboards & Admin (~1-2 hours)

**Goal**: Update all dashboard and admin pages.

**Files to modify**:
- `apps/web/src/components/CreatorDashboard.tsx`
- `apps/web/src/components/BusinessDashboard.tsx`
- `apps/web/src/components/dashboard/OverviewTab.tsx`
- `apps/web/src/components/dashboard/BookingsTab.tsx`
- `apps/web/src/components/dashboard/CreatorsTab.tsx`
- `apps/web/src/components/DailyAgenda.tsx`
- `apps/web/src/components/WeeklyAgenda.tsx`
- `apps/web/src/components/MonthlyAgenda.tsx`
- `apps/web/src/components/BookingActionCard.tsx`
- `apps/web/src/components/StaffManagement.tsx`
- `apps/web/src/components/StaffSchedulePage.tsx`
- `apps/web/src/components/WalkinModal.tsx`
- `apps/web/src/components/RescheduleModal.tsx`
- `apps/web/src/components/AddPlaceModal.tsx`
- `apps/web/src/components/BusinessOnboarding.tsx`
- `apps/web/src/components/CreatorOnboarding.tsx`
- `apps/web/src/components/BookingsList.tsx`

**Validation**:
- Walk through all 4 business dashboard tabs
- Walk through full creator dashboard
- Test walk-in creation, booking actions (confirm/decline/reschedule)
- Test business and creator onboarding flows

---

## 12. Future Considerations

Once the redesign is complete, these are natural next steps:

- **Component decomposition**: Split large components (ShopBookingPage at 1405 lines) into focused sub-files. Not needed for a color/styling update, but valuable for maintainability.
- **Image optimization**: Replace `<img>` tags with Next.js `<Image>` component for automatic optimization.
- **Skeleton loading states**: Add shimmer skeletons matching each page's layout for perceived performance.
- **Animation refinement**: Polish Framer Motion transitions between booking wizard steps.
- **Search & discovery**: Add search/filter to the landing page featured places grid.
- **Thai language**: Localization for the Bangkok market.
- **PWA**: Installable app for business owners who use the dashboard daily.

---

## 13. Risks & Mitigations

### 1. Color Change Cascades Unexpectedly
**Risk**: Updating CSS variables in `:root` changes every component that references `bridge-accent`, including components we haven't reviewed.
**Mitigation**: The token system is designed for exactly this. After Phase 1, do a full visual sweep of the site before proceeding. Any component using `bridge-accent` will get the new color automatically — this is a feature, not a bug. The risk is only if some components look wrong with red where terracotta was.

### 2. Dark Mode Breaks
**Risk**: New accent color variants don't have sufficient contrast in dark mode.
**Mitigation**: Define dark mode variants explicitly in the `.dark` section of `globals.css`. Use lighter/desaturated red for dark mode accent (not just the same hex). Test every page in dark mode after Phase 1.

### 3. Merge with `--bridge-pop` Creates Confusion
**Risk**: If we merge pop and accent, components that used pop for a different semantic purpose (e.g., "hot" indicator vs "brand" accent) lose that distinction.
**Mitigation**: Audit all `bridge-pop` usage before merging. Currently used for: hero headline period, how-it-works numbers, CTA dividers, featured card category border. All of these are brand accent usage — safe to merge.

### 4. Hard-Coded Colors Missed
**Risk**: Some components may have hard-coded hex values (e.g., `#c05636` directly in JSX) that don't go through the token system.
**Mitigation**: Run `grep -r "c05636\|#c056" apps/web/src/` to find any hard-coded references. Fix them to use tokens.

### 5. Scope Creep into "Redesign" vs "Recolor"
**Risk**: The design directives mention things like "Instagram Stories-style circles" which might imply new component designs, not just color changes.
**Mitigation**: The current CreatorsCallout already implements the stacked avatar pattern. Most of the "redesign" is already done in the current components — this PRD is primarily a brand color update with targeted UX polish. If a component needs structural changes beyond color, flag it and evaluate separately.

---

## 14. Appendix

### Files That Will Change

**Core (Phase 1)**:
- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/ui/Modal.tsx`
- `apps/web/src/components/ui/Badge.tsx`

**High Priority (Phase 2)**:
- `apps/web/src/components/ShopBookingPage.tsx`

**Medium Priority (Phase 3)**:
- `apps/web/src/components/CreatorProfilePage.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/NavBar.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/booking-confirmed/[id]/page.tsx`

**Lower Priority (Phase 4)**:
- `apps/web/src/components/CreatorDashboard.tsx`
- `apps/web/src/components/BusinessDashboard.tsx`
- `apps/web/src/components/dashboard/OverviewTab.tsx`
- `apps/web/src/components/dashboard/BookingsTab.tsx`
- `apps/web/src/components/dashboard/CreatorsTab.tsx`
- `apps/web/src/components/DailyAgenda.tsx`
- `apps/web/src/components/WeeklyAgenda.tsx`
- `apps/web/src/components/MonthlyAgenda.tsx`
- `apps/web/src/components/BookingActionCard.tsx`
- `apps/web/src/components/StaffManagement.tsx`
- `apps/web/src/components/StaffSchedulePage.tsx`
- `apps/web/src/components/WalkinModal.tsx`
- `apps/web/src/components/RescheduleModal.tsx`
- `apps/web/src/components/AddPlaceModal.tsx`
- `apps/web/src/components/BusinessOnboarding.tsx`
- `apps/web/src/components/CreatorOnboarding.tsx`
- `apps/web/src/components/BookingsList.tsx`

### Current vs New Color Tokens

| Token | Current (Light) | New (Light) |
|---|---|---|
| `--bridge-accent` | `#c05636` | `#DC2751` |
| `--bridge-accent-dark` | `#9e4429` | `#B81E42` |
| `--bridge-accent-light` | `#e8c4b8` | `#F5C6D0` |
| `--bridge-accent-soft` | `#fdf5f2` | `#FDF0F3` |
| `--bridge-accent-wash` | `#faf3ef` | `#FAF0F2` |
| `--bridge-pop` | `#d63031` | Merged → `--bridge-accent` |
| `--bridge-pop-light` | `#fde8e8` | Merged → `--bridge-accent-soft` |
| `--bridge-pop-soft` | `#e74c4c` | Removed |

### Reference Inspirations

| Page | Inspiration | What to Borrow |
|---|---|---|
| Shop Booking Page | Klook + ClassPass | Service card layout, clean price display, sticky CTA |
| Creator Profile | Linktree + Instagram | Grid layout, platform icons, bio prominence |
| Business Dashboard | Fresha/Booksy | Calendar views, booking actions, tab navigation |
| Creator Dashboard | Shopify Analytics | KPI cards, performance metrics, activity feed |
| Landing Page | — | Editorial layout already strong, just recolor |
