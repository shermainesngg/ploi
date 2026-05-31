# Plan: Company-Page TikTok Content Embedding (Phase 1)

> Generated with the `plan-feature` methodology. Source of truth: `PRD-COMPANY-PAGE-EMBEDS.md` (decisions D1–D14) and `PRD-DESIGN-SYSTEM.md` (token/primitive conventions).
>
> **Scope**: Phase 1 only — TikTok end-to-end, plus the generic abstraction (`MediaFrame`, `ContentEmbed`, provider-adapter registry) so YouTube/Instagram are follow-on plans, not rewrites. YouTube and Instagram adapters are explicitly out of scope here.

---

## Feature Description

Replace the current hand-rolled "static thumbnail that links out" pattern with a real, performant content-embedding system. Creators attach TikTok videos to a business; a poster image is fetched server-side (oEmbed) and self-hosted; the business approves each video; approved videos render on the company page as a 9:16 poster **swimlane** that mounts the real TikTok iframe only on tap (facade pattern), inside a single-instance bottom-sheet player. Content becomes a first-class **1:many** entity (`creator_content`) behind a **provider-adapter registry**.

## User Story

> **As a** creator, **I want** the TikTok videos I post about a business to appear on that business's BRIDGE page after approval, **so that** my content drives bookings (and commission) while customers stay on BRIDGE.
>
> **As a** business, **I want** to approve each creator video before it shows, **so that** I control what represents my business.
>
> **As a** customer on mid-range Android in Bangkok, **I want** the page to load fast and play video on tap, **so that** browsing creator proof doesn't cost me load time or data.

## Problem & Solution Statements

**Problem**: Content is a static manual thumbnail + `target="_blank"` link, hand-rolled in 6 places, 1:1 with a link, inconsistent aspect ratios, no real embedding, no tokenization. Native TikTok embeds are 8–12 MB + ~500 KB JS each and `embed.js` breaks on App Router soft navigation.

**Solution**: A `creator_content` (1:many) table + async oEmbed/poster pipeline (QStash worker, pg_cron re-validation) + self-hosted posters served via `next/image` + a `MediaFrame`/`ContentEmbed` facade behind a provider-adapter registry + a single-iframe bottom-sheet player. Attribution stays at the link level (unchanged).

## Feature Metadata

| Field | Value |
|---|---|
| **Type** | New capability (data model + pipeline + design-system primitives + page integration) |
| **Complexity** | High — spans DB, async infra, services, primitives, and 6 read-path refactors |
| **Affected systems** | Postgres schema, Supabase Storage, QStash, pg_cron, services/repos/actions/validation, UI primitives, ShopBookingPage, CreatorProfilePage, business dashboard, AddPlaceModal, next.config, tokens |
| **New dependencies** | `@upstash/qstash` (queue). No new image lib (use `next/image`). |
| **New env vars** | `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `CONTENT_WORKER_URL`, `INTERNAL_CRON_SECRET` |
| **Migrations** | `migration_006_creator_content.sql` (+ a later non-destructive backfill + pg_cron) |

---

## CONTEXT REFERENCES

### Files to READ before starting (patterns to mirror)
- `packages/db/migration_005_attribution.sql` — SQL conventions (`-- ──` headers, `IF NOT EXISTS`, `idx_<table>_<col>`, `on delete cascade`).
- `apps/web/src/repositories/link.repo.ts` — repo namespace pattern (`export const LinkRepo = {…}`, `createServerClient()`, `.eq().maybeSingle()`, errors propagate).
- `apps/web/src/services/link.service.ts:21-49,79-110` — service pattern (`isSupabaseConfigured()` guard, fresh client per method, `.insert().select().single()`, throw on error, embedded selects with `creators(...)`).
- `apps/web/src/actions/link.actions.ts:1-71` — server action (`'use server'`, `safeParse`, `{ error } | { success }`).
- `apps/web/src/validation/link.schema.ts:1-20` — Zod schema + `z.infer` type exports.
- `apps/web/src/lib/mappers.ts:109-123` — `rowToLink` mapper shape (snake_case → camelCase, `?? null`).
- `apps/web/src/app/api/links/route.ts:1-64` — route handler (`NextResponse.json`, status codes, calls service).
- `apps/web/src/components/ui/Modal.tsx:8-78` — **reuse this** for the player. Props: `{ open, onClose, title?, children, className? }`. Already a bottom-sheet (fixed bottom, `rounded-t-modal`, Framer spring, Escape-to-close, body scroll lock).
- `apps/web/src/components/ui/index.ts:1-9` — barrel export style.
- `apps/web/tailwind.config.ts:10-36` — `bridge` colors map (where media color tokens get wired).
- `apps/web/src/app/globals.css:5-65` — `:root` + `.dark` blocks (where media CSS vars get added).
- `apps/web/src/components/AddPlaceModal.tsx:93-118` — current submit (POST `/api/links`). To be redirected to the new content endpoint.
- `apps/web/src/lib/types.ts:31,50-63,178-184` — `SocialPlatform`, `Link`, `BusinessCreatorAffiliation`.
- `apps/web/src/services/booking.service.test.ts:1-74` — Vitest `vi.mock()` + `vi.mocked()` convention.
- `apps/web/src/services/business.service.ts` (`getPageData` ~41-87, `getAffiliations` ~167-240) — content read paths to migrate.
- `apps/web/src/components/ShopBookingPage.tsx` — CreatorBar (176-210), FeaturedServiceCard (759-838), CreatorDetailModal (491-615), AllCreatorsSheet (617-717).
- `apps/web/src/components/CreatorProfilePage.tsx:82-142` — ContentGridCard.

### New files to CREATE
| Path | Role |
|---|---|
| `packages/db/migration_006_creator_content.sql` | Table + indexes |
| `packages/db/migration_007_creator_content_backfill.sql` | Backfill from `links` (non-destructive) |
| `packages/db/migration_008_revalidate_cron.sql` | pg_cron + pg_net schedule |
| `apps/web/src/lib/providers/types.ts` | `ProviderAdapter` interface |
| `apps/web/src/lib/providers/tiktok.ts` | TikTok adapter |
| `apps/web/src/lib/providers/registry.ts` | adapter registry + URL resolver |
| `apps/web/src/lib/url-hash.ts` | normalize URL → sha256 |
| `apps/web/src/lib/qstash.ts` | QStash client + publish helper |
| `apps/web/src/lib/poster-storage.ts` | download image → upload to Supabase Storage |
| `apps/web/src/repositories/creator-content.repo.ts` | data access |
| `apps/web/src/services/creator-content.service.ts` | business logic |
| `apps/web/src/validation/creator-content.schema.ts` | Zod schemas |
| `apps/web/src/actions/creator-content.actions.ts` | submit/approve/hide actions |
| `apps/web/src/app/api/content/process/route.ts` | QStash worker |
| `apps/web/src/app/api/content/revalidate-batch/route.ts` | cron target |
| `apps/web/src/components/ui/MediaFrame.tsx` | aspect-ratio layout primitive |
| `apps/web/src/components/ui/ContentEmbed.tsx` | facade leaf |
| `apps/web/src/components/ContentPlayerModal.tsx` | single-iframe bottom-sheet player |
| `apps/web/src/components/dashboard/ContentQueueTab.tsx` | per-video approval queue |
| `apps/web/src/lib/providers/tiktok.test.ts`, `creator-content.service.test.ts`, `url-hash.test.ts` | tests |

### Docs & gotchas
- TikTok oEmbed: `GET https://www.tiktok.com/oembed?url={video_url}` — keyless. Returns `thumbnail_url` (~720×1280, **9:16**), `title` (caption), `author_name`. Signed/**expiring** thumbnail URL → must self-host. No published rate limit → keep concurrency low.
- Embed iframe: `https://www.tiktok.com/embed/v2/{external_id}` — **never** load `embed.js`. Two-tap (load → play) is inherent; player UI must signal "tap to play".
- **Supabase Storage emits WebP only, not AVIF** → let `next/image` own AVIF/WebP; do NOT stack Supabase transforms under `next/image` (D12).
- QStash is **at-least-once** → worker must be idempotent (claim-then-process; no-op if already `ok`). Use `Deduplication-Id = url_hash`.
- `poster_path` is a **host-agnostic key**, not a URL (D-§6.3) → resolve to URL at render via a single helper, so a future Cloudflare R2 swap is config-only.
- CSP: add `frame-src https://*.tiktok.com` before shipping the player.

---

## IMPLEMENTATION PLAN (phased)

- **Foundation**: migration 006, types, tokens, Storage bucket.
- **Core**: provider registry + tiktok adapter, url-hash, poster-storage, repo, mapper, validation, service, QStash + actions + worker + cron.
- **Integration**: `MediaFrame`/`ContentEmbed`/`ContentPlayerModal`, next.config, migrate the 6 read paths, swimlane on ShopBookingPage + CreatorProfilePage, redirect AddPlaceModal, dashboard approval queue, backfill (007), cron (008).
- **Testing**: unit (adapter, url-hash, service), integration (submit→worker→approve→render), manual Lighthouse.

---

## STEP-BY-STEP TASKS

> Ordered by dependency. Each task: action keyword, file, pattern to mirror, gotchas, validation.

### Foundation

**1. CREATE `packages/db/migration_006_creator_content.sql`**
- MIRROR `migration_005_attribution.sql` style (`-- ──` headers, `IF NOT EXISTS`, cascade FKs, `idx_` indexes).
- Implement the table + indexes exactly as in `PRD-COMPANY-PAGE-EMBEDS.md` §4.2–§4.3: columns (`link_id` NOT NULL, denormalized `creator_id`/`business_id`, `provider`, `content_url`, `external_id`, `url_hash`, `media_kind`, `aspect_ratio`, `poster_source`, `poster_path`, `caption`, `author_name`, `fetch_status`, `attempts`, `last_attempt_at`, `poster_expires_at`, `status`, `sort_order`, `created_at`) with the same CHECK constraints; indexes: partial composite `(business_id, sort_order) WHERE status='active'`, `(creator_id) WHERE status='active'`, `(link_id)`, unique `(business_id, provider, external_id)`, unique `(url_hash)`.
- GOTCHA: keep `links.content_*` columns — do NOT drop here.
- VALIDATION: run in Supabase SQL editor; `\d creator_content` shows all columns + 5 indexes.

**2. UPDATE `apps/web/src/lib/types.ts`**
- ADD types after `Link` (line ~63): `Provider = 'tiktok'|'instagram'|'youtube'|'x'|'other'` (reuse `SocialPlatform`), `MediaKind = 'video'|'image'|'carousel'`, `AspectRatio = 'square'|'portrait'|'vertical'|'video'`, `PosterSource = 'oembed'|'predictable'|'og'|'upload'|'branded'`, `FetchStatus = 'pending'|'fetching'|'ok'|'failed'|'unavailable'`, `ContentStatus = 'pending'|'active'|'hidden'`, and `interface CreatorContent { … }` (camelCase mirror of the table). ADD `interface ContentWithCreator { content: CreatorContent; creator: Pick<Creator,'slug'|'handle'|'displayName'|'avatarUrl'> }`.
- VALIDATION: `npm run -w apps/web typecheck` (or `tsc --noEmit`) passes.

**3. ADD media tokens — `apps/web/src/app/globals.css` + `apps/web/tailwind.config.ts`**
- In `globals.css` `:root` (after line ~30): `--bridge-media-radius: 1rem; --bridge-media-placeholder: #f2ede7; --bridge-overlay-scrim: linear-gradient(transparent, rgba(0,0,0,0.55));`
- In `.dark` (after line ~60): `--bridge-media-placeholder: #1e1a17;` **and DO NOT add `--bridge-overlay-scrim`** (theme-independent — D-§6.4). Add `--bridge-media-radius` only if it should differ (it shouldn't; define once in `:root`).
- In `tailwind.config.ts`: under `colors.bridge` add `'media-placeholder': 'var(--bridge-media-placeholder)'`; under `borderRadius` add `media: 'var(--bridge-media-radius)'`; under `backgroundImage` (create if absent) add `'overlay-scrim': 'var(--bridge-overlay-scrim)'`.
- VALIDATION: `npm run build` compiles; `bg-bridge-media-placeholder`, `rounded-media`, `bg-overlay-scrim` resolve.

**4. CREATE Supabase Storage bucket `content-posters` (manual / documented)**
- Public bucket, read-only public, write via service role. Document in plan output; not code.
- VALIDATION: bucket visible in Supabase dashboard; service-role upload succeeds.

### Core

**5. CREATE `apps/web/src/lib/url-hash.ts`**
- `normalizeUrl(raw)` (strip query/fragment, lowercase host, trailing slash) + `urlHash(raw): string` (sha256 hex via `node:crypto`).
- VALIDATION: covered by task 22 test.

**6. CREATE provider abstraction**
- `src/lib/providers/types.ts`: `ProviderAdapter` interface from PRD §6.3 (`id`, `matches`, `parse`, `oembed`, `poster`, `getEmbedUrl`, `defaultAspectRatio`, optional async `fetchMeta`).
- `src/lib/providers/tiktok.ts`: `tiktokAdapter` — `matches` (tiktok.com hostname), `parse` (extract numeric `external_id` from `/video/{id}`, `mediaKind:'video'`), `oembed.mode:'keyless'`, `poster:'oembed'`, `getEmbedUrl(id) => 'https://www.tiktok.com/embed/v2/'+id`, `defaultAspectRatio:'vertical'`, `fetchMeta(url)` → GET `https://www.tiktok.com/oembed?url=`+encoded; return `{ thumbnailUrl, caption: title, authorName }`; on non-200/empty return `{ unavailable: true }`.
- `src/lib/providers/registry.ts`: `adapters = { tiktok: tiktokAdapter }`; `resolveAdapter(url)` → first `.matches(url)` or throw.
- GOTCHA: `fetchMeta` sets a realistic `User-Agent` header; wrap in try/catch → `{ unavailable: true }` on throw (worker decides retry vs terminal).
- VALIDATION: task 22 test.

**7. CREATE `apps/web/src/lib/qstash.ts`**
- Export a configured `@upstash/qstash` `Client` (token from `QSTASH_TOKEN`) and `enqueueContentJob(id: string)` → `client.publishJSON({ url: process.env.CONTENT_WORKER_URL, body: { id }, deduplicationId: id })`.
- GOTCHA: in local dev without QStash, no-op + log (mirror `isSupabaseConfigured()` guard style). Add `isQstashConfigured()`.
- VALIDATION: `npm run build` compiles.

**8. CREATE `apps/web/src/lib/poster-storage.ts`**
- `downloadAndStorePoster(opts:{ id, imageUrl }): Promise<string>` → fetch bytes, upload to `content-posters/{id}.jpg` via `createServerClient().storage`, return the storage key (`content-posters/{id}.jpg`). Plus `resolvePosterUrl(poster_source, poster_path): string|null` (Supabase public URL for stored; passthrough for predictable; null for branded).
- GOTCHA: store the **original** bytes, no transform (D12). Return a **key**, not a URL.
- VALIDATION: integration test (task 24).

**9. CREATE `apps/web/src/lib/mappers.ts` addition**
- ADD `rowToCreatorContent(r): CreatorContent` MIRRORING `rowToLink` (snake→camel, `?? null`).
- VALIDATION: typecheck.

**10. CREATE `apps/web/src/validation/creator-content.schema.ts`**
- MIRROR `link.schema.ts`. `submitContentSchema = z.object({ creatorSlug, businessSlug, contentUrl: z.string().url(), platform: z.enum([...]), featuredServiceId: z.string().uuid().optional().or(z.literal('')) })`; `moderateContentSchema = z.object({ contentId: z.string().uuid(), status: z.enum(['active','hidden']) })`. Export `z.infer` types.
- VALIDATION: typecheck.

**11. CREATE `apps/web/src/repositories/creator-content.repo.ts`**
- MIRROR `link.repo.ts` (`export const CreatorContentRepo = {…}`, `createServerClient()`). Methods: `upsertPending(row)` (insert `ON CONFLICT (url_hash) DO NOTHING` via `.upsert(..., { onConflict: 'url_hash', ignoreDuplicates: true })`), `claimForProcessing(id)` (`.update({fetch_status:'fetching'}).eq('id',id).in('fetch_status',['pending','failed']).select().maybeSingle()`), `markOk(id, fields)`, `markFailed(id, error)` (increment attempts), `markUnavailable(id)`, `listActiveForBusiness(businessId)` (embedded `creators(...)` select, `.eq('status','active').order('sort_order')`), `listPendingForBusiness(businessId)`, `listForCreator(creatorId)`, `setStatus(id, status)`, `findExpiring(limit)` (`status='active'`, `poster_expires_at < now()+12h`, order asc, limit).
- GOTCHA: `claimForProcessing` is the idempotency guard — the `.in('fetch_status', [...])` is load-bearing.
- VALIDATION: typecheck; covered by service tests.

**12. CREATE `apps/web/src/services/creator-content.service.ts`**
- MIRROR `link.service.ts` (`isSupabaseConfigured()` guard, throw on error). Methods:
  - `submit({creatorSlug, businessSlug, contentUrl, platform, featuredServiceId})`: resolve adapter; `parse` url; resolve creator+business ids (Promise.all like `link.actions.ts:19-22`); **find-or-create link** (reuse `LinkService.create` if none for the pair, else use existing — respects `unique(creator_id,business_id)`); compute `urlHash`; `CreatorContentRepo.upsertPending({...})`; return `{ id, status:'pending' }`.
  - `process(id)`: claim → `adapter.fetchMeta` → if unavailable `markUnavailable` → else (tiktok) `downloadAndStorePoster` → `markOk({ poster_path, poster_source:'oembed', caption, author_name, poster_expires_at: now+5d })`. Throw on transient error (worker rethrows for QStash retry).
  - `listForBusiness(businessId)`, `listPendingForBusiness`, `moderate(contentId, status)`, `revalidateBatch(limit)`.
- VALIDATION: task 23 test.

**13. CREATE `apps/web/src/actions/creator-content.actions.ts`**
- MIRROR `link.actions.ts`. `submitContent(formData)`: `submitContentSchema.safeParse` → `CreatorContentService.submit(...)` → `enqueueContentJob(id)` → return `{ success:true, id, status }`. `moderateContent(formData)`: `moderateContentSchema.safeParse` → `CreatorContentService.moderate(...)`.
- GOTCHA: enqueue AFTER the row exists; if enqueue throws, still return success (cron will pick up `pending` rows as a backstop) — log the error.
- VALIDATION: typecheck.

**14. CREATE `apps/web/src/app/api/content/process/route.ts`**
- MIRROR `api/links/route.ts` structure. Verify QStash signature (`@upstash/qstash/nextjs` `verifySignatureAppRouter`), parse `{ id }`, call `CreatorContentService.process(id)`. On `unavailable` return `489` + header `Upstash-NonRetryable-Error: true`. On transient error rethrow (→ 500 → QStash retries).
- VALIDATION: task 24 integration.

**15. CREATE `apps/web/src/app/api/content/revalidate-batch/route.ts`**
- Auth via `Authorization: Bearer ${INTERNAL_CRON_SECRET}`. Body `{ limit }`. `CreatorContentService.revalidateBatch(limit)` → for each expiring row `enqueueContentJob(id)`. Return count.
- VALIDATION: curl with secret returns `{ enqueued: N }`.

### Integration

**16. CREATE `apps/web/src/components/ui/MediaFrame.tsx` + export in `ui/index.ts`**
- Props `{ aspectRatio: AspectRatio; radius?: 'media'|'card'|'none'; className?; children }`. Map enum → `aspect-square|aspect-[4/5]|aspect-[9/16]|aspect-video`. Apply `bg-bridge-media-placeholder`, `overflow-hidden`, `rounded-media` (default). Use `cn()`. `forwardRef`.
- VALIDATION: build; renders reserved box (no CLS).

**17. CREATE `apps/web/src/components/ui/ContentEmbed.tsx` + export**
- `'use client'`. Props `{ provider, externalId, posterUrl?, caption?, authorName?, aspectRatio?, onOpen }`. Render `<MediaFrame>` → `next/image` poster (or `bg-overlay-scrim` + caption fallback when no poster) + a focusable play `<button onClick={onOpen}>` + optional platform badge + `bg-overlay-scrim` gradient for legibility. NO iframe here.
- GOTCHA: poster `<Image>` needs `sizes` + explicit dims or `fill`; below-fold lazy (default), never `priority`.
- VALIDATION: build; Lighthouse shows no third-party JS at load.

**18. CREATE `apps/web/src/components/ContentPlayerModal.tsx`**
- `'use client'`. Reuse `Modal` (`open`, `onClose`). Props `{ items: ContentWithCreator[]; index; onIndexChange; onClose }`. Render **exactly one** `<iframe src={resolveEmbedUrl(item)} loading="lazy" allow="autoplay; encrypted-media" className="w-full aspect-[9/16]">` for the active index; swipe/prev-next changes index (remounts the single iframe). Loading state shows "Tap to play". Include a small "View on TikTok" link (creator view-credit hedge, D-risk). Unmount iframe on close.
- GOTCHA: **exactly one iframe** is load-bearing — keyed by active item id so it remounts, never N iframes.
- VALIDATION: task 25 manual + unmount-on-close test.

**19. UPDATE `apps/web/next.config.*`**
- ADD `images.formats = ['image/avif','image/webp']`; ADD Supabase Storage host to `images.remotePatterns`. ADD CSP header `frame-src https://*.tiktok.com` (extend existing headers() or add).
- VALIDATION: `next/image` serves AVIF on capable browser; iframe not CSP-blocked.

**20. UPDATE `apps/web/src/services/business.service.ts`**
- In `getPageData`/`getAffiliations`, REPLACE reading `link.content_*` with `CreatorContentRepo.listActiveForBusiness(businessId)` (embedded `creators(...)`, one query — mirror `dashboard.service.ts:262`). Return `ContentWithCreator[]` on the page payload.
- GOTCHA: keep attribution untouched (`link_id`/`short_code`).
- VALIDATION: shop page server fetch returns active content; one SQL query (no N+1).

**21. REFACTOR `apps/web/src/components/ShopBookingPage.tsx`**
- REPLACE the 4 ad-hoc content displays (CreatorBar 176-210, FeaturedServiceCard 759-838, CreatorDetailModal 491-615, AllCreatorsSheet 617-717) with: a 9:16 **swimlane** of `ContentEmbed` cards (horizontal scroll, peek next ~15%, lazy after first ~4, "load more" past ~20) + a single `ContentPlayerModal`. Each card links its creator chip to the profile (Discovery Loop). Keep the sticky Book CTA.
- VALIDATION: visual; tap opens player; one iframe.

**22. REFACTOR `apps/web/src/components/CreatorProfilePage.tsx:82-142`**
- REPLACE `ContentGridCard` thumbnail logic with `MediaFrame` + `ContentEmbed` (consistent posters/overlay tokens). Wire to the same player.
- VALIDATION: build; visual.

**23. UPDATE `apps/web/src/components/AddPlaceModal.tsx:93-118`**
- REDIRECT submit from `POST /api/links` to the `submitContent` server action (or a new `POST /api/content`). Drop the manual `thumbnailUrl` field (poster now auto-fetched). Show optimistic "processing…" state on success.
- GOTCHA: link find-or-create now happens inside `CreatorContentService.submit` — don't double-create.
- VALIDATION: submit a real TikTok URL → row appears `fetch_status='pending'`.

**24. CREATE `apps/web/src/components/dashboard/ContentQueueTab.tsx` + wire into business dashboard**
- List `listPendingForBusiness` (poster once `fetch_status='ok'`, caption, creator, featured service). Approve → `moderateContent(active)`; Hide → `moderateContent(hidden)`. Approving the first piece also activates the link (call `LinkService.updateStatus(linkId,'active')`). Add as a tab alongside Creators (mirror existing tab pattern in `BusinessDashboard.tsx`).
- VALIDATION: approve → content renders on company page.

**25. CREATE `packages/db/migration_007_creator_content_backfill.sql`**
- INSERT one `creator_content` row per `links` row with `content_url` (set `fetch_status='ok'`, `status='active'`, `poster_source='upload'` when `content_thumbnail_url` present, `sort_order=0`, `url_hash` via app-side or `md5(content_url)`).
- GOTCHA: run AFTER read paths cut over (tasks 20–22). Idempotent (guard on `uq_creator_content_external`).
- VALIDATION: existing content still renders post-cutover.

**26. CREATE `packages/db/migration_008_revalidate_cron.sql`**
- `cron.schedule('revalidate-posters','0 * * * *', net.http_post(... /api/content/revalidate-batch, Bearer secret, {limit:50}))` (PRD §5.3).
- VALIDATION: cron row in `cron.job`; manual `net.http_post` enqueues.

### Testing

**27. CREATE tests** (MIRROR `booking.service.test.ts` `vi.mock`/`vi.mocked`):
- `src/lib/providers/tiktok.test.ts` — `parse` extracts id; `matches`; `getEmbedUrl`; `fetchMeta` (mock fetch) ok + unavailable.
- `src/lib/url-hash.test.ts` — normalization + stable hash.
- `src/services/creator-content.service.test.ts` — `submit` upserts pending + reuses existing link; `process` ok path (claims → stores → markOk), unavailable path (markUnavailable), idempotent no-op when already `ok`, transient error rethrows.

---

## TESTING STRATEGY

- **Unit**: adapter parsing/fetchMeta (mock `fetch`), url-hash stability, service state transitions with mocked repo + poster-storage + qstash.
- **Integration**: end-to-end submit → worker (`/api/content/process`) → markOk → moderate → `listActiveForBusiness` returns it. Idempotency: deliver the same job twice, assert single processing. Unavailable: deleted URL → `unavailable` + 489.
- **Edge cases**: oEmbed 200 but image download fails (row stays `failed`, retried, never `ok`); duplicate URL resubmit (no second row); expiring poster → `findExpiring` picks it; player close unmounts iframe; no-poster fallback renders branded card.
- **Performance**: Lighthouse mobile on a populated company page — assert no TikTok JS at load, LCP < 2.5s, CLS ≈ 0.

## VALIDATION COMMANDS

```bash
# Level 1 — syntax / types / lint
cd /Users/shermainesng/ploi
npm run lint
npx -w apps/web tsc --noEmit

# Level 2 — units
npm run test        # vitest run; new files: tiktok.test, url-hash.test, creator-content.service.test

# Level 3 — integration / build
npm run build       # next build; verifies routes, next.config images/CSP, token classes
# Worker smoke (dev): submit a TikTok URL via AddPlaceModal, then:
#   curl -XPOST localhost:3000/api/content/process -H 'content-type: application/json' -d '{"id":"<row-id>"}'
#   → row flips fetch_status pending→ok, poster object exists in content-posters bucket
# Cron smoke:
#   curl -XPOST localhost:3000/api/content/revalidate-batch -H "authorization: Bearer $INTERNAL_CRON_SECRET" -d '{"limit":5}'

# Level 4 — manual
npm run dev
#  1. Creator: AddPlaceModal → paste real TikTok URL → see "processing", then poster
#  2. Business dashboard: ContentQueueTab → Approve
#  3. Company page: poster appears in 9:16 swimlane; tap → bottom-sheet plays ONE iframe; swipe works; close unmounts
#  4. DevTools: no embed.js / no tiktok JS at page load; AVIF poster served; Lighthouse LCP<2.5s CLS≈0
```

## ACCEPTANCE CRITERIA

- [ ] `migration_006` applied: `creator_content` + 5 indexes exist.
- [ ] Creator submits a TikTok URL → `creator_content` row `fetch_status='pending'`, `status='pending'`; creator sees optimistic card.
- [ ] QStash worker fetches oEmbed, stores poster in `content-posters`, flips `fetch_status='ok'`; deleted/private URL → `unavailable` (489, no retry storm).
- [ ] Worker is idempotent (double delivery processes once; resubmit creates no second row).
- [ ] Business approves in ContentQueueTab → `status='active'`; first approval also activates the link.
- [ ] Company page renders only `fetch_status='ok' AND status='active'` as a 9:16 swimlane of `ContentEmbed` posters via one SQL query (no N+1).
- [ ] Tap → `ContentPlayerModal` mounts exactly one `tiktok.com/embed/v2/{id}` iframe; swipe changes video; close unmounts.
- [ ] No TikTok JS at page load; `next/image` serves AVIF/WebP; LCP < 2.5s, CLS ≈ 0 on mobile Lighthouse.
- [ ] Attribution unchanged (commission tests still pass; `link_id`/`short_code` untouched).
- [ ] Media tokens (`--bridge-media-radius`, `--bridge-media-placeholder` light+dark, `--bridge-overlay-scrim` light-only) present; scrim NOT remapped in `.dark`.
- [ ] Backfill (007) keeps existing content visible after cutover; `links.content_*` columns retained.
- [ ] pg_cron (008) scheduled; `revalidate-batch` enqueues expiring rows.
- [ ] `npm run lint && tsc --noEmit && npm run test && npm run build` all pass.

## NOTES

- **Design decisions** (full rationale in `PRD-COMPANY-PAGE-EMBEDS.md` §3): facade over native embed (perf + App Router); 1:many `creator_content` (content wall); link-level attribution v1 (commission correct, per-video analytics deferred); async pipeline (avoid half-written rows / blocking the creator); self-host posters (TikTok thumbnail rot); `next/image` owns AVIF because Supabase emits WebP only.
- **Trade-offs**: visible processing delay between submit and poster-ready (covered by optimistic card); per-video approval adds business workload (escape hatch: trusted-creator fast-path, deferred); creators lose TikTok view-credit when watched in-modal (hedge: "View on TikTok" link).
- **Out of scope (follow-on plans)**: YouTube adapter (predictable thumbnail, no storage), Instagram adapter (keyless `/embed`, upload/branded poster), per-video click attribution, Cloudflare R2 poster migration, dropping `links.content_*`.
- **Host-agnostic posters**: `poster_path` is a key resolved by `resolvePosterUrl` — the single seam for a future R2 swap.

---

### Plan report

- **File**: `.agents/plans/company-page-tiktok-embeds.md`
- **Summary**: Phase-1 TikTok content embedding — `creator_content` 1:many table, async oEmbed/poster pipeline (QStash + pg_cron), self-hosted posters via `next/image`, `MediaFrame`/`ContentEmbed` facade behind a provider-adapter registry, single-iframe bottom-sheet player, per-video approval, and migration of the 6 existing read paths.
- **Complexity**: High — DB + async infra + new primitives + 6 read-path refactors + a new dashboard surface.
- **Top risks**: (1) **QStash worker idempotency/partial-failure** — the claim-then-process + store-before-`ok` ordering must be exactly right or you get half-written rows; (2) **single-iframe discipline** in the player — easy to regress into the wall-of-iframes problem the whole design avoids; (3) **the 6 read-path cutover + backfill ordering** — must migrate reads before backfilling, keep `links.content_*` until verified.
- **Confidence (one-pass agent execution)**: **6.5/10**. The code-layer tasks (schema, repo, service, primitives, refactors) are well-cited and high-confidence; the deductions are for external infra that needs real credentials and live providers — QStash signature wiring, Supabase Storage bucket/RLS, pg_cron, and TikTok oEmbed behavior on real (and deleted) URLs — which need a human in the loop to provision and verify.
