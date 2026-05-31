# BRIDGE Company-Page Content Embedding — Product Requirements Document

> **Scope**: How creator social-media content (TikTok first; YouTube and Instagram next) is stored, processed, and embedded on company/business pages. Covers the data model, the async ingestion pipeline, the design-system primitives, and the phased rollout. Builds on `PRD-DESIGN-SYSTEM.md` (tokens + primitive library) and feeds the Discovery Loop described in `CLAUDE.md`.
>
> **Status**: Design locked. Audited against the live schema (`packages/db/schema.sql`), attribution code, and 2025–2026 Supabase/Vercel/provider docs. Ready to implement.

---

## 1. Executive Summary

Today, a creator's social content is a **static thumbnail + play button that links out** (`target="_blank"`), hand-rolled in **six places** across `ShopBookingPage.tsx`, `CreatorProfilePage.tsx`, and the dashboards. Thumbnails are entered manually (`links.content_thumbnail_url`) or fall back to the business cover photo. Aspect ratios are inconsistent (`aspect-video`, `aspect-[4/5]`) even though TikTok content is natively 9:16. There is no media tokenization and no real embedding.

This PRD defines a deliberate, scalable system: creator content becomes a first-class **1:many** entity (`creator_content`), posters are sourced via provider **oEmbed/OG** and self-hosted, and content renders through a **facade pattern** — a cheap poster card that mounts the heavy provider iframe **only on tap**, inside a bottom-sheet player. A **provider-adapter registry** makes TikTok the first of several providers (YouTube, Instagram) without rewriting the components.

The guiding constraint is **mid-range Android in Bangkok on slow connections**: never load a third-party player at page load, reserve every media box to keep CLS at zero, and keep image bytes minimal.

---

## 2. Goals & Non-Goals

### Goals
1. Embed creator content **in-place** on company pages without tanking load speed (no SDK at page load, ever).
2. Make the poster-card pattern a **single source of truth** — one primitive, six call sites refactored onto it.
3. Support **multiple creators × multiple videos** per business (the content wall that powers discovery).
4. Be **provider-extensible**: adding YouTube or Instagram = adding one adapter file.
5. Keep posters **durable and fast** (self-hosted, optimized) and the data model **attribution-safe**.

### Non-Goals
- Per-video click attribution (v1 keeps attribution at the link level — see §4.4).
- Autoplay/muted-preview of TikTok (impossible — TikTok embeds have no autoplay API).
- Replicating the full in-app TikTok experience. The poster carries the social proof; the iframe is for those who tap.
- Instagram production oEmbed with a Meta app token (deferred; v1 uses the keyless `/embed` iframe).
- A normalization service (Iframely/Embedly). Reconsider only if Instagram becomes core (see §7.3).

---

## 3. Resolved Decision Log

These were settled through structured design review. Recorded with rationale so future contributors know *why*, not just *what*.

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Content's job on the page | Social proof → booking (glanceable, not a rabbit hole) | The page exists to convert bookings; content builds trust without sending users away. |
| D2 | Where content is watched | In-place, on our page | Protects the booking flow and feeds the Discovery Loop. |
| D3 | Embedding technique | **Facade** — cached poster, mount iframe only on tap. No `embed.js`. | TikTok native embed is 8–12 MB + ~500 KB JS per video and `embed.js` breaks on App Router soft navigation (no re-init API). Facade also avoids pre-tap privacy tracking (PDPA-friendly). |
| D4 | Tap behavior | **Bottom-sheet `Modal`**, exactly **one** live iframe, swipe between videos | Reuses an existing primitive, enforces single-iframe discipline, best mobile watch UX. |
| D5 | Content cardinality | **1:many** → new `creator_content` table | A creator can recommend a business with several posts over time; powers the content wall. |
| D6 | Moderation | **Per-video approval** (`status`: pending/active/hidden) | Businesses control what appears on their page; adds a content queue to the dashboard. |
| D7 | Design-system scope | **Full**: `MediaFrame` + `ContentEmbed` + adapter registry + media tokens; refactor 6 sites | The pattern is past the PRD-DESIGN-SYSTEM "second use case" bar — 6 call sites, 1:many, multi-provider. |
| D8 | Abstraction timing | **Genericize now** (`ContentEmbed`, `external_id`, `media_kind`, `poster_source`) | Retrofitting a DB column + rename across 6 sites later is far costlier than doing it once upfront. |
| D9 | TikTok poster | Keyless oEmbed → **download + self-host** to Supabase Storage | Only way to get a real TikTok thumbnail (can't derive from ID); self-hosting kills thumbnail-URL rot and enables `next/image`. |
| D10 | YouTube poster | **Predictable URL** (`img.youtube.com/vi/{id}/hqdefault.jpg`), no fetch/store | Stable, non-expiring, public — storing it adds no value. |
| D11 | Instagram poster + embed | Keyless `/embed` iframe; poster = creator-upload → branded fallback (OG-scrape best-effort) | No keyless oEmbed since 2020; thumbnail removed from oEmbed Nov 2025; server-side OG scraping is actively blocked at scale. |
| D12 | Image format | **`next/image` owns AVIF/WebP** against the original object | Supabase transforms emit **WebP only**, not AVIF. Never double-optimize (Supabase transform under `next/image`). |
| D13 | Ingestion pipeline | **Async**: QStash (initial fetch) + Supabase pg_cron (re-validation) | Synchronous fetch risks half-written rows and blocks the creator on slow provider calls. |
| D14 | Attribution granularity | **Link-level (v1)** | Commission is per creator-business, so link-level is 100% correct; per-video analytics deferred. |

---

## 4. Data Model

### 4.1 Why content moves off `links`

The `links` table is the **attribution** entity: `unique(creator_id, business_id)` (one link per pair), and attribution keys on `link_id` / `short_code` / normalized `customer_phone` — **never** on `content_url`/`platform`/`content_thumbnail_url`. Those three are display-only. **Audit confirmed**: moving content to a separate table does not touch attribution logic (`attribution.service.ts`, `migration_005`, `bookings.link_id`).

The content fields are also 1:1 today, which can't represent a creator posting multiple videos about one business. Hence a dedicated 1:many table.

### 4.2 `creator_content` schema

```sql
create table if not exists creator_content (
  id              uuid primary key default uuid_generate_v4(),

  -- relationships (link_id implies creator+business, but denormalize for indexing)
  link_id         uuid not null references links(id) on delete cascade,
  creator_id      uuid not null references creators(id) on delete cascade,
  business_id     uuid not null references businesses(id) on delete cascade,

  -- source identity
  provider        text not null
                    check (provider in ('tiktok','instagram','youtube','x','other')),
  content_url     text not null,
  external_id     text,                 -- numeric id (TikTok) | shortcode (IG/YouTube)
  url_hash        text not null,        -- sha256 of normalized URL; idempotency key

  -- media description
  media_kind      text not null default 'video'
                    check (media_kind in ('video','image','carousel')),
  aspect_ratio    text not null default 'vertical'
                    check (aspect_ratio in ('square','portrait','vertical','video')),

  -- poster
  poster_source   text                  -- 'oembed'|'predictable'|'og'|'upload'|'branded'
                    check (poster_source is null or poster_source in
                      ('oembed','predictable','og','upload','branded')),
  poster_path     text,                 -- HOST-AGNOSTIC key (not a full URL) — see §6.3
  caption         text,
  author_name     text,

  -- ingestion pipeline state (see §5)
  fetch_status    text not null default 'pending'
                    check (fetch_status in ('pending','fetching','ok','failed','unavailable')),
  attempts        integer not null default 0,
  last_attempt_at timestamptz,
  poster_expires_at timestamptz,

  -- moderation state (see §4.5) — SEPARATE axis from fetch_status
  status          text not null default 'pending'
                    check (status in ('pending','active','hidden')),

  sort_order      integer not null default 0,
  created_at      timestamptz default now()
);
```

### 4.3 Indexes

```sql
-- Hot path: active content for a business, pre-sorted (partial composite kills the Sort node)
create index idx_creator_content_business_active
  on creator_content (business_id, sort_order) where status = 'active';

-- Creator profile page: a creator's active content
create index idx_creator_content_creator_active
  on creator_content (creator_id) where status = 'active';

-- Join/filter by link
create index idx_creator_content_link on creator_content (link_id);

-- Dedup guard: a creator can't attach the same video to a business twice
create unique index uq_creator_content_external
  on creator_content (business_id, provider, external_id);

-- Idempotency for the ingestion pipeline
create unique index uq_creator_content_url_hash on creator_content (url_hash);
```

### 4.4 Attribution stays at link level (D14)

One link per creator-business means a click/booking attributes to the **link**, not a specific video. Commission (10% first / 5% repeat) is unaffected — it's defined per creator-business. The trade-off: no "which video converted best" analytics in v1. If creators demand it later, add a content-level click counter and a content-aware click route; the schema (`external_id`, `link_id`) leaves room without a breaking change.

### 4.5 Two independent state axes

- **`fetch_status`** — the ingestion pipeline (`pending → fetching → ok | failed | unavailable`). Owned by the worker.
- **`status`** — moderation (`pending → active | hidden`). Owned by the business.

A row can be `fetch_status='ok'` (poster ready) but `status='pending'` (awaiting approval). The company page renders only `fetch_status='ok' AND status='active'`.

### 4.6 Migration & backfill (non-destructive)

1. **Migration `006`**: create `creator_content` + indexes. **Keep** `links.content_url` / `platform` / `content_thumbnail_url`.
2. **Backfill**: one `creator_content` row per link with content (`fetch_status='ok'`, `status='active'`, `poster_source='upload'` for existing manual thumbnails, `sort_order=0`).
3. **Cut over** the six read paths (§7.4) to read from `creator_content`.
4. **Later migration**: once all reads are migrated and verified, drop the `links.content_*` columns.

Never drop columns in the same migration that adds the table.

---

## 5. Ingestion Pipeline (async)

### 5.1 Why async (D13)

Synchronous oEmbed-fetch + image-download + Storage-upload inside a Server Action risks: (a) blocking the creator on a slow TikTok response, (b) a **half-written row** when oEmbed succeeds but the download fails, (c) no retries. Vercel's 300s timeout is *not* the blocker — the failure modes are. So submit-time work is minimal; the heavy work is queued.

### 5.2 Flow

```
Server Action (sync, <1s)
  1. Zod-validate URL
  2. Resolve provider adapter; parse external_id, media_kind, default aspect_ratio
  3. Compute url_hash (normalized URL → sha256)
  4. UPSERT creator_content { fetch_status:'pending', status:'pending', url_hash } ON CONFLICT DO NOTHING
  5. Enqueue { id } to QStash (Deduplication-Id = url_hash)
  6. return { success:true, status:'pending' }     ← creator sees "processing"

QStash → POST /api/content/process  (Vercel Node function; retries+backoff+dedup from QStash)
  1. claimForProcessing(id): SET fetch_status='fetching' WHERE fetch_status IN ('pending','failed')
  2. if already 'ok' → no-op (idempotent)
  3. adapter.fetchMeta(url):
       - TikTok:   keyless oembed → thumbnail_url, title(caption), author_name
       - YouTube:  predictable thumbnail URL (no fetch needed)
       - Instagram: /embed iframe; poster from upload/branded (OG best-effort)
  4. if provider says deleted/private → fetch_status='unavailable'; return 489 + Upstash-NonRetryable-Error
  5. for self-hosted posters: download image → upload to Supabase Storage → poster_path
  6. ONLY NOW: fetch_status='ok', poster_expires_at = now()+5d, write caption/author
  7. on transient error: markFailed (attempts++); throw → QStash retries with backoff
```

### 5.3 Tooling

- **Initial fetch** → **Upstash QStash**: HTTP-native publish to a Next.js Route Handler, built-in 3-retry exponential backoff, `Deduplication-Id` for idempotency, zero infra.
- **Re-validation** → **Supabase pg_cron + pg_net**: scheduled job calls `/api/content/revalidate-batch`, which selects the **N soonest-to-expire** `ok` rows and re-enqueues each to the same idempotent worker. O(expiring), not O(total).
- **Worker runtime**: Vercel Node function (not Supabase Edge Functions — 2s CPU isolate limit).

```sql
-- pg_cron: refresh soonest-to-expire posters hourly
select cron.schedule('revalidate-posters', '0 * * * *', $$
  select net.http_post(
    url := 'https://app.bridge/api/content/revalidate-batch',
    headers := '{"Authorization":"Bearer <internal-secret>"}'::jsonb,
    body := '{"limit":50}'::jsonb
  );
$$);
```

### 5.4 Reliability patterns

- **Idempotency**: `unique(url_hash)` + `ON CONFLICT DO NOTHING` at submit, plus QStash `Deduplication-Id`. Resubmits create neither a second row nor a second job.
- **Partial failure**: never flip to `ok` until the poster is durably stored. A row is only "done" when display can't break.
- **Re-validation strategy**: TTL (`poster_expires_at`) + scheduled batch of the oldest **+ refresh-on-404** as the correctness net (serve via our own copy; if a re-fetch 404s, enqueue one refresh).
- **Politeness**: bounded concurrency (queue parallelism, not unbounded `Promise.all`), realistic User-Agent, respect 429 as retryable. TikTok keyless oEmbed has no published rate limit — stay conservative.

---

## 6. Design-System Primitives & Tokens

### 6.1 `MediaFrame` — layout primitive

Dumb, provider-agnostic. Reserves the box (CLS = 0), applies radius + placeholder.

```tsx
interface MediaFrameProps {
  aspectRatio: 'square' | 'portrait' | 'vertical' | 'video'  // 1:1 | 4:5 | 9:16 | 16:9
  radius?: 'media' | 'card' | 'none'
  className?: string
  children: React.ReactNode
}
```

- Uses native CSS `aspect-ratio` (`aspect-square`, `aspect-[4/5]`, `aspect-[9/16]`, `aspect-video`).
- Applies `--bridge-media-placeholder` as the empty/loading background.
- Knows nothing about images vs video — overlays and embeds are composed **as children**.

### 6.2 `ContentEmbed` — facade leaf

```tsx
interface ContentEmbedProps {
  provider: 'tiktok' | 'instagram' | 'youtube'
  externalId: string
  posterSrc?: string          // host-agnostic key resolved to a URL
  caption?: string
  authorName?: string
  aspectRatio?: MediaFrameProps['aspectRatio']  // defaults from adapter
  onOpen?: () => void         // opens the bottom-sheet player
}
```

- Renders poster (`next/image`) + play affordance (a real focusable `<button>`). **No SDK, no iframe at rest.**
- On tap → `onOpen` → bottom-sheet `Modal` mounts **one** `<iframe src={adapter.getEmbedUrl(externalId)} loading="lazy">`; close unmounts it. Swipe between siblings = discovery feed.
- The modal's loading state must signal **"tap to play"** (the two-tap limit persists for TikTok/IG raw iframes).
- Attribution/overlay/creator chip are **composed children**, never props (no `showCreator`/`overlayVariant` boolean creep).

### 6.3 Provider-adapter registry

Plain objects, no React — framework-portable. Adding a provider = adding one file.

```ts
interface ProviderAdapter {
  id: 'tiktok' | 'instagram' | 'youtube'
  matches(url: string): boolean
  parse(url: string): { externalId: string; mediaKind: 'video' | 'image' | 'carousel' }
  oembed: { mode: 'keyless' | 'token' | 'none' }
  poster: 'oembed' | 'predictable' | 'og' | 'upload' | 'branded'
  getEmbedUrl(externalId: string): string        // raw iframe URL, no SDK
  defaultAspectRatio: MediaFrameProps['aspectRatio']
  fetchMeta?(url: string): Promise<{ thumbnailUrl?: string; caption?: string; authorName?: string; unavailable?: boolean }>
}
```

| Adapter | oEmbed | `getEmbedUrl` | poster | aspect |
|---|---|---|---|---|
| `tiktok` | keyless | `tiktok.com/embed/v2/{id}` | oembed → self-host | vertical |
| `youtube` | none (skip) | `youtube-nocookie.com/embed/{id}` | predictable URL | video |
| `instagram` | n/a (v1) | `instagram.com/{p\|reel}/{id}/embed` | upload → branded (og best-effort) | `/reel/`→vertical, `/p/`→square |

**`poster_path` is a host-agnostic key**, resolved to a URL at render time. This lets us flip Supabase Storage → Cloudflare R2 (zero egress) as a config change when egress costs appear (§8).

### 6.4 New tokens (fits the existing 2-layer system)

Add to `globals.css` (`:root` and `.dark` where noted), map in `tailwind.config.ts`:

```css
--bridge-media-radius: 1rem;                                   /* media corner radius */
--bridge-media-placeholder: #f2ede7;  /* light */             /* skeleton/empty bg — THEME-DEPENDENT */
/* .dark: --bridge-media-placeholder: #1e1a17; */
--bridge-overlay-scrim: linear-gradient(transparent, rgba(0,0,0,0.55));  /* THEME-INDEPENDENT */
```

**Critical**: `--bridge-overlay-scrim` keeps text/attribution legible over photos. A photo is equally bright in light and dark mode, so **do not remap the scrim in `.dark`** — it is the one media token that is theme-independent. This differs from `--bridge-hero-gradient`, which is a brand gradient and may theme.

---

## 7. Layout & UX

### 7.1 Company page content section

- **Vertical video** (TikTok/IG Reels): horizontal **swimlane carousel** of 9:16 cards, peek the next ~15% to signal swipe. **Not a grid** — two 9:16 tiles on a 390px phone are unreadable.
- Lazy-load posters below the first ~4; **"load more"** past ~20 cards (facades are cheap; this is comfortable headroom).
- Each card carries the creator chip → links to the creator profile (Discovery Loop).
- Content-first ordering: photos → creator video → services → creator chips, with the existing **sticky bottom Book CTA** always in reach.

### 7.2 Bottom-sheet player

- Reuses the existing `Modal` bottom-sheet. Mounts exactly **one** iframe. Swipe = next video.
- **Single-iframe discipline is load-bearing** — needs an explicit unmount-on-close test (a regression mounting a second iframe reintroduces the wall-of-iframes problem).
- A small "View on {platform}" link inside the modal is a cheap hedge: gives the creator a real view-credit (we optimized for booking over creator metrics) without losing the customer.

### 7.3 Instagram specifics

The `/embed` iframe only renders **public** content and won't auto-size — use a fixed aspect box. Private/deleted → graceful fallback card (handle + caption + link out). If Instagram becomes a core provider, revisit routing IG through Iframely/Embedly (handles Meta token + thumbnails + responsive sizing) — but only IG, not all providers.

### 7.4 The six read paths to refactor

All currently read `content_*` from `links` via `SELECT *`; each moves to an embedded join on `creator_content`:

1. `creator.service.ts:48` (creator profile)
2. `business.service.ts:74` (shop page single link)
3. `business.service.ts:196` (shop affiliations list)
4. `dashboard.service.ts:262` (creator dashboard link performance)
5. `link.service.ts:92` (pending link approvals)
6. `link.service.ts:130` (active creator list)

Query stays one round-trip (PostgREST embedded resource, as `dashboard.service.ts` already does):

```ts
db.from('creator_content')
  .select(`id, provider, content_url, external_id, media_kind, poster_source,
           poster_path, aspect_ratio, caption, author_name, sort_order,
           creators ( slug, handle, display_name, avatar_url )`)
  .eq('business_id', businessId).eq('status', 'active')
  .order('sort_order', { ascending: true })
```

---

## 8. Performance & Cost Budget

| Metric | Target (mobile) |
|---|---|
| LCP | < 2.5s — hero photo uses `next/image` `priority`; **never** lazy-load it |
| CLS | → 0 — every `MediaFrame` reserves its box + placeholder |
| INP | < 200ms — facades (no third-party JS until tap) + capped image decodes |

- **Image format**: `images.formats = ['image/avif','image/webp']`; `next/image` encodes against the **original** stored poster. Do not stack Supabase transforms underneath.
- **Storage cost** (audited): ~200k posters @ ~100 KB ≈ 20 GB → free within the 100 GB Supabase Pro quota. **Egress** is the only variable, costing money past ~250 GB/mo (~2.5M poster deliveries: ~$7.50–22.50/mo at that point).
- **Escape hatch**: when egress consistently exceeds the quota, migrate poster objects to **Cloudflare R2** (zero egress, $0.015/GB storage) fronted by Cloudflare's edge (strong SG/BKK presence). Because `poster_path` is host-agnostic, this is a config flip, not a migration.
- **Connection pooling**: current `supabase-js`/PostgREST path is already pooled. If a direct Postgres client is ever added, use **Supavisor** transaction mode.

---

## 9. Implementation Phases

### Phase 1 — TikTok end-to-end (the trojan horse)
- [x] Migration `007`: `creator_content` + indexes (keep `links.content_*`) — `migration_007` / `supabase/migrations/...0007`
- [x] Backfill existing link content into `creator_content` — `migration_008` / `...0008`
- [x] `MediaFrame` + `ContentEmbed` primitives + tokens (`media-radius`, `media-placeholder`, `overlay-scrim`)
- [x] `tiktok` adapter — `lib/providers/{types,tiktok,index}.ts` (+ unit tests)
- [x] Server Action (validate → upsert pending → enqueue) + QStash worker route + state machine — `content.service`, `content.actions`, `lib/qstash` (dev fallback to direct dispatch), `api/content/process`
- [x] pg_cron re-validation batch route — `api/content/revalidate-batch` + `packages/db/cron_revalidate_posters.sql` (apply manually)
- [x] Bottom-sheet player (single iframe, swipe, unmount-on-close test) — `ContentPlayer.tsx` + `ContentPlayer.test.ts`
- [x] ~~Refactor the 6 read paths~~ → content **wall** wired on the company page (`ShopBookingPage`) + dashboard queue; the 6 legacy `links.content_*` display reads still work (non-destructive) and are a tracked follow-up cutover
- [x] Per-video approval queue in the business dashboard — `CreatorsTab` "Content to Review"
- [x] CSP: `frame-src https://*.tiktok.com` — `next.config.ts` `headers()`

**Status**: Backend pipeline + primitives + player + carousel + approval queue + CSP all implemented; `tsc`, 72 unit tests, and `next build` green. Content auto-enrolls into the pipeline when a creator adds a link with a supported URL (`api/links` route).

**New env vars (all optional with dev fallbacks)**: `QSTASH_TOKEN` (prod enqueue; dev dispatches the worker directly), `CONTENT_WORKER_SECRET` (worker auth; defaults to a dev secret), `NEXT_PUBLIC_POSTER_CDN_URL` (R2/CDN poster host override). Self-hosting needs a public `content-posters` Storage bucket; absent it, the worker falls back to the remote TikTok thumbnail URL.

**Validation**: a creator submits a TikTok URL → poster appears after processing → business approves → renders in the swimlane → tap opens the player → Lighthouse mobile LCP < 2.5s, CLS ≈ 0.

### Phase 2 — YouTube
- [ ] `youtube` adapter (predictable thumbnail, `youtube-nocookie` iframe, no storage)
- [ ] CSP: add `https://*.youtube-nocookie.com`
- [ ] `media_kind='video'`, `aspect_ratio='video'` rendering in the swimlane (16:9 alongside 9:16)

### Phase 3 — Instagram
- [ ] `instagram` adapter (keyless `/embed`, poster = upload → branded, OG best-effort)
- [ ] Creator-upload poster flow in `AddPlaceModal`
- [ ] Handle `media_kind` image/carousel; private/deleted fallback card
- [ ] CSP: add `https://*.instagram.com`

### Later (only if demanded)
- Per-video click attribution (§4.4)
- Cloudflare R2 poster migration (§8)
- Iframely/Embedly for Instagram (§7.3)
- Drop `links.content_*` columns

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Two-tap playback** persists in the modal | Loading state explicitly signals "tap to play"; never looks frozen |
| **Single-iframe regression** reintroduces iframe wall | Explicit unmount-on-close test; one player instance enforced by the modal |
| **Half-written rows** | Async pipeline; flip to `ok` only after poster is durably stored |
| **TikTok thumbnail rot** | Self-host the poster; TTL + pg_cron batch + refresh-on-404 |
| **Instagram OG-scrape blocked at scale** | Treat OG as best-effort; rely on creator-upload/branded poster |
| **Per-video approval bottleneck** | Watch the queue; add a trusted-creator fast-path if it starves the loop |
| **Egress cost at scale** | Host-agnostic `poster_path` → flip to Cloudflare R2 |
| **Creator view-credit lost** (booking-first choice) | "View on {platform}" link inside the modal |
| **CSP blocks iframe** in prod | Allowlist provider `frame-src` before each phase ships |
| **TikTok caching is ToS-grey; IG needs attribution** | Keep attribution (handle + caption) in card chrome |

---

## 11. Cross-Reference to `PRD-DESIGN-SYSTEM.md`

This PRD extends the design system. Append a section to `PRD-DESIGN-SYSTEM.md`:

- **New primitives**: `MediaFrame`, `ContentEmbed` join Button/Card/Input/Badge/Avatar/Modal/Skeleton/EmptyState/Tabs. They follow the same conventions (`forwardRef` where applicable, `cn()`, variants as `as const`, barrel export).
- **New tokens**: `--bridge-media-radius`, `--bridge-media-placeholder` (theme-dependent), `--bridge-overlay-scrim` (theme-independent). These are the first **media** tokens — note the theme-independence exception in the token philosophy.
- **Aspect-ratio enum**: `square | portrait | vertical | video` is a constrained design decision (a prop, not a token). Reject one-off ratios.
- **Provider-adapter registry**: a new lightweight pattern (plain-object strategy) — the first non-component abstraction in the system. Documented here, not duplicated.

This is the point at which BRIDGE's design system crosses from "primitives" into "media architecture." It remains lightweight: two components, three tokens, one registry — built because the usage (6 sites, 1:many, multi-provider) earns it, exactly as the parent PRD's "build on real need" rule prescribes.
