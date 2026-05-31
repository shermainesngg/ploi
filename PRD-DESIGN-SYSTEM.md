# BRIDGE Design System — Product Requirements Document

> **Scope**: Design system architecture, token strategy, and component primitive library. This is the foundation layer that the UI/UX redesign (see `PRD-UIUX-REDESIGN.md`) builds upon. Decisions here affect every current and future page.

---

## 1. Executive Summary

BRIDGE's design system has grown organically from MVP to a working token-based architecture. It currently has: CSS custom properties in `globals.css`, Tailwind mappings in `tailwind.config.ts`, 8 UI primitives (Button, Card, Input/Textarea, Badge, Avatar, Modal, Skeleton, EmptyState), and a warm stone neutral palette with BRIDGE red accent.

The system works — but it has gaps. There are 53+ instances of raw Tailwind color classes (`bg-amber-100`, `text-red-600`, etc.) outside the token system. Status colors live as hard-coded Tailwind classes in Badge and are duplicated ad-hoc in other components. The `--bridge-pop` tokens exist as aliases pointing to `--bridge-accent` — dead weight from the terracotta era. There's no component for tabs, toggles, selects, or tooltips, so these patterns are reimplemented per-page.

**This PRD asks**: What should BRIDGE's design system look like as a deliberate, scalable foundation — and what's the minimum investment to get there without over-engineering for a product that's still finding product-market fit?

---

## 2. Mission

**Design System Mission**: Provide a token-driven, component-based design language that makes it faster to build consistent BRIDGE pages than to deviate — while staying lightweight enough for a small team to maintain.

**Core Principles**:

1. **Tokens over magic numbers.** Every visual decision (color, spacing, shadow, radius) flows from a named token. If you can't name it, question why it exists.
2. **Small component library, deep quality.** Fewer primitives, each handling its variants well, beats a large library of shallow components.
3. **Mobile-first, Thai-market-aware.** Bangkok users on mid-range Android phones. Performance and touch targets matter more than desktop polish.
4. **Semantic, not decorative.** Colors communicate meaning (status, emphasis, brand) — not decoration. A color used "because it looks nice" is a future inconsistency.
5. **Composable over configurable.** Prefer composing simple components over adding props to complex ones. A `Card` with children beats a `Card` with 12 layout props.

---

## 3. Current State Audit

### What's Working Well

| Area | Status | Notes |
|---|---|---|
| CSS custom properties → Tailwind mapping | Strong | Clean layer: `globals.css` defines vars, `tailwind.config.ts` maps them. Theme changes cascade automatically. |
| Neutral palette | Strong | The warm stone tones (`#faf8f5` bg, `#f2ede7` surface, `#2a2320` heading) are distinctive and cohesive. |
| Typography scale | Strong | 8 named sizes from `micro` to `display` with responsive clamping on large sizes. |
| Spacing tokens | Adequate | `section`, `card-padding`, `input-y`, `input-x` cover the main cases. |
| Border radius tokens | Strong | `card`, `button`, `input`, `modal`, `badge` — semantic naming. |
| Shadow tokens | Adequate | `card`, `card-hover`, `modal` — covers current needs. |
| Core primitives | Good | Button, Card, Input, Modal are well-built with variants, `forwardRef`, `cn()`. |

### What Needs Attention

| Area | Issue | Impact |
|---|---|---|
| **Status colors** | Hard-coded as raw Tailwind classes (`bg-amber-50`, `text-emerald-700`) in Badge and duplicated in 53+ places across components | Color changes require find-and-replace across the codebase. No dark mode awareness. |
| **`--bridge-pop` tokens** | Three tokens (`pop`, `pop-light`, `pop-soft`) that are now aliases for `accent`. Still mapped in Tailwind config. | Dead weight. Confuses new contributors about which to use. |
| **Missing primitives** | No Tab, Toggle/Switch, Select/Dropdown, Tooltip, Divider, or Progress component | These patterns exist but are re-built per page with inconsistent styling. |
| **Font loading** | `--font-display` (DM Serif Display) and `--font-body` (Inter) defined in `layout.tsx` via `next/font` — works but no fallback metrics | FOUT risk on slow connections. |
| **Avatar color** | `color` prop takes a raw hex string, rendered via inline `style` | Bypasses the token system. Not theme-aware. |
| **Error states** | Ad-hoc `bg-red-50 text-red-600` patterns scattered across forms | No standard error display component or token. |

---

## 4. Design Decisions to Make

These are the architectural forks where we need alignment before writing code.

### Decision 1: Token Granularity — How Many Layers?

**Option A: Two-layer (current) — CSS vars → Tailwind**
```
globals.css:        --bridge-accent: #DC2751
tailwind.config:    accent: 'var(--bridge-accent)'
component:          className="bg-bridge-accent"
```

**Option B: Three-layer — Primitive → Semantic → Component**
```
globals.css:        --color-red-500: #DC2751          (primitive)
                    --bridge-accent: var(--color-red-500)  (semantic)
tailwind.config:    accent: 'var(--bridge-accent)'
component:          className="bg-bridge-accent"
```

**Option C: Three-layer with component tokens**
```
globals.css:        --color-red-500: #DC2751          (primitive)
                    --bridge-accent: var(--color-red-500)  (semantic)
                    --button-primary-bg: var(--bridge-accent) (component)
```

**Recommendation**: Stay with **Option A** (two-layer). BRIDGE is a single-brand product with one team. Three layers add indirection without solving a real problem today. Revisit if BRIDGE ever needs white-labeling or business-branded themes.

**Trade-off**: Less flexible for future theming, but simpler to understand, fewer files to touch, and no abstraction debt if BRIDGE pivots.

### Decision 2: Status Colors — Tokenize or Leave Raw?

**Current state**: Raw Tailwind classes like `bg-amber-50 text-amber-700 border-amber-200/80` appear in Badge variants and are copy-pasted into BookingActionCard, DailyAgenda, etc.

**Option A: Tokenize as CSS custom properties**
```css
--bridge-status-confirmed-bg: #ecfdf5;
--bridge-status-confirmed-text: #15803d;
--bridge-status-confirmed-border: rgba(167, 243, 208, 0.8);
/* ... for each status */
```

**Option B: Centralize as a shared Tailwind class map (exportable object)**
```ts
// src/lib/status-colors.ts
export const statusColors = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
  // ...
}
```

**Option C: Keep in Badge, import Badge everywhere**
Badge already defines these. Other components should use `<Badge>` instead of reimplementing.

**Recommendation**: **Option B** as a bridge (pun intended). Extract a shared `statusColors` map that Badge and other components import. This solves the duplication without adding 18+ CSS variables for something Tailwind already handles. Move to CSS vars only if dark mode status colors become a requirement.

**Trade-off**: Raw Tailwind classes aren't theme-aware, so dark mode for status colors will need manual overrides in the map. But status colors are functional, not brand — they rarely change.

### Decision 3: The `--bridge-pop` Cleanup

**Current state**: `--bridge-pop`, `--bridge-pop-light`, `--bridge-pop-soft` all point to their `accent` equivalents. In Tailwind config, `pop`, `pop-light`, `pop-soft` are mapped.

**Options**:
- **A: Remove completely** — delete from `globals.css`, `tailwind.config.ts`, and replace all `bridge-pop` usage in components with `bridge-accent`.
- **B: Keep as semantic aliases** — rename to something meaningful if there's a use case for a second brand color.

**Recommendation**: **Option A** — remove completely. Grep shows the pop tokens are used on landing page (headline period, how-it-works numbers, CTA dividers) and featured card borders. All of these are brand accent usage. Merging simplifies the palette.

### Decision 4: Missing Primitives — Build Now or Later?

Components that are reimplemented per-page:

| Component | Used in | Build now? |
|---|---|---|
| **Tabs** | Business dashboard (4 tabs), possibly creator dashboard | Yes — high duplication |
| **Toggle/Switch** | Settings, availability toggles | Maybe — low usage currently |
| **Select/Dropdown** | Service category, time picker | Maybe — native `<select>` works on mobile |
| **Tooltip** | Dashboard metrics, info icons | No — limited mobile utility |
| **Divider** | Multiple pages | No — a `<hr>` with token styling is fine |
| **Progress** | Onboarding steps | Maybe — used in 2 places |

**Recommendation**: Build **Tabs** now (clear duplication problem). Defer the rest — each should be built when a second use case appears, not before.

### Decision 5: Avatar Color Strategy

**Current state**: Avatar takes a `color` prop as a raw hex string and applies it via inline `style`. This means:
- Avatars bypass the token system
- No dark mode adaptation
- Business/creator colors are stored as hex in the database

**Options**:
- **A: Define a fixed palette of 8-10 avatar colors as CSS vars**, map database colors to nearest palette match.
- **B: Keep dynamic colors but wrap in a theme-aware utility** that adjusts lightness/saturation for dark mode.
- **C: Leave as-is** — avatar background colors are decorative, not semantic. They're only visible when there's no profile photo.

**Recommendation**: **Option C** for now. Avatar colors are a fallback for missing photos. As BRIDGE grows and real profile photos become common, this matters less. If dark mode is a priority, revisit with Option B.

### Decision 6: Dark Mode — Investment Level

**Current state**: Full dark mode token set exists in `globals.css` under `.dark`. Dark mode class toggling via `darkMode: 'class'` in Tailwind config.

**Question**: Is dark mode a real user need for BRIDGE's target market (Bangkok beauty/wellness bookings), or is it engineering polish?

**Options**:
- **A: First-class dark mode** — test every component, ensure status colors work, document in design system.
- **B: Maintenance mode** — keep the tokens, fix obvious breaks, but don't actively test or refine.
- **C: Remove** — strip dark mode tokens, ship light-only, reclaim the CSS weight.

**Recommendation**: **Option B** (maintenance mode). Bangkok beauty customers booking via Instagram links will be in light mode. Business owners using the dashboard might prefer dark mode for long sessions — but that's a future persona need. Keep the tokens (they're already written), but don't block the redesign on dark mode perfection.

---

## 5. Proposed Token Architecture

Based on the decisions above, here's the proposed clean token set:

### Color Tokens

```css
:root {
  /* Brand */
  --bridge-accent: #DC2751;
  --bridge-accent-dark: #B81E42;
  --bridge-accent-light: #F5C6D0;
  --bridge-accent-soft: #FDF0F3;
  --bridge-accent-wash: #FAF0F2;

  /* Neutrals (warm stone — unchanged) */
  --bridge-bg: #faf8f5;
  --bridge-surface: #f2ede7;
  --bridge-card: #ffffff;
  --bridge-border: #e3dbd2;
  --bridge-border-strong: #d1c7bb;
  --bridge-muted: #8f8279;
  --bridge-secondary: #6b5e54;
  --bridge-text: #3d3530;
  --bridge-heading: #2a2320;

  /* Supplementary */
  --bridge-sage: #7a8f72;
  --bridge-sage-light: #e8ede6;

  /* Gradients */
  --bridge-hero-gradient: linear-gradient(135deg, #DC2751, #F97316);

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(42, 35, 32, 0.06), 0 1px 2px rgba(42, 35, 32, 0.04);
  --shadow-card-hover: 0 4px 16px rgba(42, 35, 32, 0.08);
  --shadow-modal: 0 -4px 24px rgba(42, 35, 32, 0.1);
}
```

**Removed**: `--bridge-pop`, `--bridge-pop-light`, `--bridge-pop-soft` (merged into accent)

**No additions** — the current palette covers all use cases. Adding tokens "just in case" creates unused complexity.

### Typography Tokens (unchanged)

The existing 8-step scale (`display` → `micro`) with responsive clamping is well-calibrated. No changes recommended.

### Spacing Tokens (unchanged + 1 consideration)

Current: `section` (2.5rem), `card-padding` (1.25rem), `input-y` (0.75rem), `input-x` (1rem).

**Consideration**: A `gap-stack` token (e.g., 1rem) for consistent vertical spacing between stacked cards/items could reduce the current mix of `space-y-3`, `space-y-4`, `gap-3`, `gap-4` across pages. But this is cosmetic — defer unless spacing inconsistency becomes a real user-facing issue.

### Tailwind Config (cleaned)

```ts
colors: {
  bridge: {
    accent: 'var(--bridge-accent)',
    'accent-dark': 'var(--bridge-accent-dark)',
    'accent-light': 'var(--bridge-accent-light)',
    'accent-soft': 'var(--bridge-accent-soft)',
    'accent-wash': 'var(--bridge-accent-wash)',
    bg: 'var(--bridge-bg)',
    surface: 'var(--bridge-surface)',
    card: 'var(--bridge-card)',
    border: 'var(--bridge-border)',
    'border-strong': 'var(--bridge-border-strong)',
    muted: 'var(--bridge-muted)',
    secondary: 'var(--bridge-secondary)',
    text: 'var(--bridge-text)',
    heading: 'var(--bridge-heading)',
    sage: 'var(--bridge-sage)',
    'sage-light': 'var(--bridge-sage-light)',
  },
}
```

**Removed**: `pop`, `pop-light`, `pop-soft` from Tailwind mappings.

---

## 6. Component Primitive Library

### Current Primitives (keep & refine)

| Component | Status | Refinement Needed |
|---|---|---|
| **Button** | Production-ready | None — clean variants, sizes, loading state, `forwardRef` |
| **Card** | Production-ready | None — 4 variants cover the use cases |
| **Input / Textarea** | Production-ready | None — label, error, icon support, accessible |
| **Badge** | Good | Extract `statusColors` to shared map so other components can import |
| **Avatar** | Adequate | Consider `alt` text improvements for accessibility |
| **Modal** | Production-ready | None — bottom sheet pattern is correct for mobile-first |
| **Skeleton / SkeletonText / SkeletonCard** | Good | None |
| **EmptyState** | Good | None |
| **AnimateOnScroll** | Adequate | None |

### Proposed New Primitive: Tabs

A Tabs component would consolidate the tab patterns in Business Dashboard and potentially other dashboard views.

```tsx
interface TabsProps {
  tabs: { key: string; label: string; badge?: number }[]
  active: string
  onChange: (key: string) => void
}
```

Styling: sticky horizontal scroll on mobile, `bg-bridge-heading text-white` for active tab (matching current dashboard pattern).

**Build trigger**: During Phase 4 of the UI/UX redesign (dashboards).

### Components NOT to Build Yet

| Component | Why Not |
|---|---|
| Select/Dropdown | Native `<select>` is better on mobile. Custom dropdowns are accessibility nightmares. |
| Toggle/Switch | Only used in 1-2 places. A checkbox with styling is fine. |
| Tooltip | Doesn't work well on touch devices. Use inline help text instead. |
| Toast/Notification | Not in current UX. Build when needed. |
| Accordion | Collapsible sections already implemented ad-hoc with Framer Motion — works fine. |

### Media Primitives (see `PRD-COMPANY-PAGE-EMBEDS.md`)

The company-page content-embedding work extends this library with the system's first **media** primitives and tokens. They are specified in full in `PRD-COMPANY-PAGE-EMBEDS.md`; summarized here so this document stays the index of the primitive library:

| Addition | Type | Note |
|---|---|---|
| **MediaFrame** | Primitive | Layout-only wrapper that reserves an aspect-ratio box (CLS = 0), applies media radius + placeholder. `aspectRatio` is a constrained **prop enum** (`square \| portrait \| vertical \| video`), not a token. |
| **ContentEmbed** | Primitive | Facade leaf for social video — poster + play button at rest, mounts a provider iframe only on tap (bottom-sheet `Modal`). No third-party SDK at page load. Overlays/attribution are **composed children**, not props. |
| **Provider-adapter registry** | Pattern | First non-component abstraction in the system — plain-object strategies (`tiktok`, `youtube`, `instagram`). Adding a provider = adding one file. |
| `--bridge-media-radius` | Token | Media corner radius. |
| `--bridge-media-placeholder` | Token | Skeleton/empty media bg. **Theme-dependent** (light + dark values). |
| `--bridge-overlay-scrim` | Token | Legibility gradient over photos/video. **Theme-independent** — the one media token NOT remapped in `.dark` (a photo is equally bright in both modes). Distinct from the brand `--bridge-hero-gradient`. |

This is the point at which the design system crosses from "primitives" into "media architecture" — built because the usage (6 existing call sites, 1:many content, multi-provider) earns it, consistent with this PRD's "build on real need" rule.

---

## 7. Status Color System

### Shared Status Color Map

```ts
// src/lib/status-colors.ts
export const statusStyles = {
  confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80' },
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200/80' },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200/80' },
  declined:  { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200/80' },
  completed: { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200/80' },
  no_show:   { bg: 'bg-bridge-surface', text: 'text-bridge-secondary', border: 'border-bridge-border' },
  repeat:    { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200/80' },
  active:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80' },
  walkin:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200/80' },
  paid:      { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200/80' },
} as const
```

Badge would import from this map. Other components (BookingActionCard, DailyAgenda, etc.) would also import from here instead of hard-coding.

---

## 8. Implementation Phases

### Phase 0: Token Cleanup (~15 min)

**Goal**: Remove dead tokens, clean up the foundation.

- [ ] Remove `--bridge-pop`, `--bridge-pop-light`, `--bridge-pop-soft` from `globals.css` (both `:root` and `.dark`)
- [ ] Remove `pop`, `pop-light`, `pop-soft` from `tailwind.config.ts`
- [ ] Find-and-replace all `bridge-pop` usage in components → `bridge-accent` (and `bridge-pop-light` → `bridge-accent-soft`)
- [ ] Verify no broken references

**Validation**: `npm run build` passes. Grep for `bridge-pop` returns zero results.

### Phase 1: Status Color Consolidation (~30 min)

**Goal**: Single source of truth for status colors.

- [ ] Create `src/lib/status-colors.ts` with the shared map
- [ ] Update Badge to import from the shared map
- [ ] Update BookingActionCard, DailyAgenda, and other components using ad-hoc status colors to import from the shared map
- [ ] Add `walkin` and `paid` status styles (currently hard-coded in calendar components)

**Validation**: Grep for ad-hoc status color patterns shows only the shared map file.

### Phase 2: Tabs Primitive (~30 min)

**Goal**: Reusable Tabs component for dashboards.

- [ ] Create `src/components/ui/Tabs.tsx`
- [ ] Export from `src/components/ui/index.ts`
- [ ] Refactor Business Dashboard tab navigation to use the new component
- [ ] Verify styling matches current dashboard behavior

**Validation**: Business Dashboard tabs work identically. Component is reusable.

### Phase 3: Integration with UI/UX Redesign

The design system work in Phases 0-2 should happen **before** the page-by-page visual redesign in `PRD-UIUX-REDESIGN.md`. Clean tokens → clean pages.

---

## 9. Success Criteria

- [ ] Zero `bridge-pop` references in codebase
- [ ] Status colors defined in exactly one file, imported everywhere
- [ ] All color usage in components goes through either `bridge-*` tokens or the shared status color map
- [ ] Hard-coded hex colors in component files: zero (excluding Avatar's dynamic color prop)
- [ ] `npm run build` passes
- [ ] No visual regressions on any page (since pop already aliases to accent, removal should be invisible)
- [ ] Design system is documented in this PRD — no separate documentation site needed at this scale

---

## 10. Risks & Mitigations

### 1. Over-Engineering for Scale That May Never Come
**Risk**: Building a three-layer token system, a 20-component library, and a Storybook instance for a product with <5 pages and 1 developer.
**Mitigation**: This PRD deliberately recommends the minimal viable design system. Every "build later" decision is intentional. Revisit at 10+ pages or 3+ developers.

### 2. Status Color Map Becomes Stale
**Risk**: New statuses get added to the database but not to the shared map, causing runtime errors or falling back to unstyled badges.
**Mitigation**: TypeScript types. The status map keys should align with the booking status enum. A missing key produces a type error at build time.

### 3. Tailwind v4 Migration
**Risk**: Tailwind v4 changes how CSS custom properties and config work. The current `tailwind.config.ts` approach may need reworking.
**Mitigation**: BRIDGE uses Tailwind 3 with standard CSS vars. The migration path is well-documented. The two-layer approach (CSS vars → Tailwind) is the recommended Tailwind v4 pattern, so BRIDGE is actually ahead of the curve.

### 4. Premature Primitive Extraction
**Risk**: Building a Tabs component that doesn't match the actual tab patterns across pages, requiring immediate modification.
**Mitigation**: Build Tabs during the dashboard redesign phase (PRD-UIUX-REDESIGN Phase 4), not before. The real usage will inform the API.

---

## 11. What This PRD Intentionally Excludes

| Topic | Why Excluded |
|---|---|
| **Storybook / component playground** | Overhead for a 1-person team. The real pages ARE the playground. |
| **Design tokens package** | Only one consumer (apps/web). A package adds build complexity for zero benefit. |
| **CSS-in-JS migration** | Tailwind + CSS vars is working. Switching to styled-components/emotion/vanilla-extract solves no current problem. |
| **Animation tokens** | Framer Motion handles animations. Tokenizing spring configs adds indirection without value. |
| **Figma token sync** | No Figma file exists. If one is created, sync tooling can be added then. |
| **Accessibility audit** | Important but separate concern. Focus ring colors use the token system, which is good. A full audit deserves its own workstream. |
| **White-label / business theming** | Not a current product requirement. If businesses want branded booking pages, that's a feature PRD, not a design system task. |

---

## 12. Open Questions for Discussion

1. **Is the warm stone neutral palette the right long-term bet?** It's distinctive (not the typical gray) but may feel too "earthy" as BRIDGE evolves beyond beauty/wellness. Does it scale to food, fitness, events?

2. **Should BRIDGE red (#DC2751) be the permanent brand color?** The shift from terracotta was recent. Is this the final answer, or should we test alternatives before committing across all pages?

3. **How much should dark mode matter right now?** Tokens exist, but is anyone testing it? Should we ship light-only and add dark mode when there's user demand?

4. **Is the font pairing (DM Serif Display + Inter) correct?** Serif display + sans body is a strong editorial look, but competitors (ClassPass, Fresha) are pure sans-serif. Does the serif add character or friction?

5. **Should the design system support right-to-left (RTL) for future Thai/Arabic markets?** This affects spacing token directionality. Thai is LTR, so not urgent, but worth discussing.

---

## 13. Appendix

### Current File Map

| File | Role |
|---|---|
| `apps/web/src/app/globals.css` | CSS custom property definitions (light + dark) |
| `apps/web/tailwind.config.ts` | Tailwind token mappings, typography, spacing, shadows |
| `apps/web/src/components/ui/` | Primitive component library (9 components) |
| `apps/web/src/components/ui/index.ts` | Barrel export for all primitives |
| `apps/web/src/lib/cn.ts` | `clsx` + `tailwind-merge` utility |
| `apps/web/src/app/layout.tsx` | Font loading (`next/font/google`) |

### Token Count Summary

| Category | Count |
|---|---|
| Color tokens (light) | 17 (15 after pop removal) |
| Color tokens (dark) | 17 (15 after pop removal) |
| Typography tokens | 8 |
| Spacing tokens | 4 |
| Shadow tokens | 3 |
| Border radius tokens | 5 |
| Gradient tokens | 1 |
| Animation tokens | 3 |
| **Total** | ~54 tokens |

### Raw Tailwind Color Usage (to be consolidated)

53 instances of non-token Tailwind colors across components, primarily:
- Status colors (emerald, amber, red, sky, violet) — 40+ instances
- Walk-in/paid indicators (blue, green) — 5+ instances
- Error states (red-50, red-600) — 5+ instances
