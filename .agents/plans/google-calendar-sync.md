# Feature: PLOI Calendar — visual calendar UI + Google Calendar sync

Validate documentation and codebase patterns before implementing. Pay attention to naming of existing utils, types, and models. Import from the right files. This codebase uses a strict layered architecture: **API route → Service → Repository → Supabase**. Side-effect services (notifications, calendar sync) are **fire-safe** — they catch their own errors and never break a booking flow.

> **This plan has two parts on the same Calendar page:**
> - **PART A — Google Calendar sync (one-way push).** The backend bridge: confirmed PLOI bookings push to the owner's Google Calendar. (Tasks below, the original plan.)
> - **PART B — PLOI Calendar UI (Schedule-X).** A real visual calendar surface in the Calendar tab — the thing users *see* and call "the PLOI calendar". Hybrid: Schedule-X grid on desktop, keep the existing mobile-first agendas on phones. (New section before TESTING STRATEGY.)
>
> They're independently shippable; Part B can land first (no external deps), Part A adds the Google bridge. Where they meet: calendar events visually reflect Part A's `googleSyncStatus`.

## Feature Description
Let a business connect its Google Calendar so that **confirmed PLOI bookings are pushed into Google Calendar automatically**. The business owner clicks a one-time **"Connect Google Calendar"** button in the dashboard Calendar tab (OAuth). After that, every booking that becomes `confirmed` is written to Google as an event; rescheduling updates the event in place; cancelling/declining removes it. This is **one-way only** (PLOI → Google). Reading Google events back to suppress PLOI availability is explicitly **Phase 2** (sketched at the end, not built here).

There is no separate "PLOI calendar" object — a confirmed booking already *is* the PLOI calendar entry (rendered by the Calendar tab). So the feature is purely: confirmed booking → Google event.

## User Story
As a **business owner**
I want **my confirmed PLOI bookings to appear automatically in my Google Calendar**
So that **my whole schedule lives in one place I already check, without manual double-entry**.

## Problem Statement
Owners run their day from Google Calendar but bookings live only in PLOI. They either miss appointments or re-type them by hand. There's no bridge, even though the DB columns for one were scaffolded in migration_006 and never used.

## Solution Statement
A fire-safe `CalendarSyncService` (modeled on `notification.service.ts`) is invoked from the existing booking mutation points. It uses an OAuth refresh token (stored encrypted) to create/update/delete events on the business's connected calendar. Per-booking sync status is persisted and surfaced in the dashboard so silent failures are visible, with a manual **Re-sync** to repair drift.

## Feature Metadata
- **Type**: New Capability
- **Complexity**: High (OAuth + external API + encryption + new schema + UI; mitigated by reusing existing patterns)
- **Systems Affected**: Booking mutation API, services layer, repositories, DB schema, business dashboard UI, env config
- **Dependencies**: `googleapis` (Part A), Node `crypto` (built-in), Google Cloud OAuth client credentials; **Schedule-X** packages (Part B); both new npm deps

---

## DECISIONS LOCKED (from design grilling — do not re-litigate)
- **Direction:** One-way PLOI → Google. Do **not** read Google events. `businesses.google_sync_token` stays dormant (it's for incremental *read* sync — Phase 2).
- **Trigger:** Auto-push on `confirmed` / reschedule / cancel. The button is a one-time **Connect**, not a per-event sync.
- **Granularity:** One business-level Google account → one calendar (existing `businesses.google_calendar_id`).
- **Event lifecycle:** confirm → create · reschedule → update · cancel/decline → delete (decline never had an event, so delete is a no-op guard) · completed/no_show → leave untouched.
- **Event content:** Internal only. **No customer attendee / no Google invite** (avoids double-emailing alongside Resend). Customer name + service in title/description.
- **Rollout:** Pilot/demo only. **Skip Google OAuth verification** (stay under the ~100 test-user cap). Verification is a pre-GA task, out of scope here.
- **Timezone:** Read the connected calendar's timezone **once at connect** and store it; compose `booking_date` + `booking_time` against it. (Those two columns carry no timezone.)
- **Failure handling:** Per-booking sync status + visible indicator + manual Re-sync. Push never blocks a booking.
- **Token security:** Encrypt the refresh token at rest (AES-256-GCM, server-only key) — **launch blocker, not deferred**.
- **Disconnect:** Revoke + clear creds, stop future syncs, **leave** already-pushed events in place.
- **Scope foresight:** Request the read-capable scope `https://www.googleapis.com/auth/calendar.events` now so Phase 2's read side needs no re-consent.

---

## CONTEXT REFERENCES

### Files to Read Before Implementing
- `apps/web/src/services/notification.service.ts` (lines 1-9, 129-171) — **The fire-safe side-effect pattern to mirror exactly.** Note the `if (!isEmailConfigured()) return` guard, the `try/catch` that only `console.error`s, the `PascalCase` namespace-object export, and `loadBooking()` (87-95) that joins related rows.
- `apps/web/src/lib/email.ts` (lines 14-16, 28-54) — The **`isXConfigured()` + silent-no-op** convention. Mirror this for `isGoogleCalendarConfigured()`. Note `sendEmail` never throws.
- `apps/web/src/app/api/bookings/[id]/route.ts` (lines 70-129) — **The mutation hook point.** `update.status` is set at 83; reschedule at 104-105; the existing fire-safe notification calls at 122-129 are exactly where the calendar-sync calls go alongside. `isBusinessOwner` (53) gates business-only actions.
- `apps/web/src/repositories/booking.repo.ts` (lines 24-110) — Repo conventions: `createServerClient()` per call, `throw new Error(error.message)`, `maybeSingle()` vs `single()`. `findForNotification` (48-63) shows the embed-select style; add new methods here in the same shape.
- `apps/web/src/app/api/businesses/[slug]/connect-stripe/route.ts` (whole file) — **The OAuth/connect route precedent.** Mirror: config guard (12-17), `params: Promise<{ slug }>` (11), look up business by slug (22-27), persist the external id back to `businesses` (49-53), build a redirect URL using `req.headers.get('origin') ?? NEXT_PUBLIC_SITE_URL` (55), return `{ url }` for the browser to redirect to (63).
- `apps/web/src/lib/supabase.ts` (lines 13-15, 33-40) — `isSupabaseConfigured()` and `createServerClient()` (service-role, bypasses RLS). All repos use the latter.
- `apps/web/src/lib/ownership.ts` (lines 1-60) — `getAuthIdentity()` and `decideAccess()` for guarding the connect/disconnect/resync routes (owner-only). Unclaimed demo businesses return `'granted'`.
- `apps/web/src/services/location.service.ts` + `repositories/location.repo.ts` + `validation/location.schema.ts` — **Canonical shape for a new service/repo/schema trio** (newest code in the repo). Match this structure for any new files.
- `apps/web/src/components/BusinessDashboard.tsx` (lines 60-67, 150-157, 172-219) — The connect-button click pattern (`fetch(.../connect-stripe, {method:'POST'})` at 65, `connecting` state, button at 150-154) and the **Calendar tab header (174-191)** where the Connect/Re-sync control goes.
- `packages/db/migration_006_pre_launch.sql` (lines 142-152) and `packages/db/setup.sql` (lines 557-567) — The **existing, unused** Google columns: `businesses.google_calendar_id / google_refresh_token / google_sync_token / google_last_synced_at`, `bookings.google_event_id`. New migration **adds to** these, doesn't recreate them.

### New Files to Create
- `apps/web/src/lib/crypto.ts` — AES-256-GCM `encryptSecret()` / `decryptSecret()` helpers (Node `crypto`).
- `apps/web/src/lib/google-calendar.ts` — `isGoogleCalendarConfigured()`, `getOAuthClient()`, `buildAuthUrl()`, and a thin `getCalendarClient(refreshToken)` factory wrapping `googleapis`.
- `apps/web/src/services/calendar-sync.service.ts` — Fire-safe `CalendarSyncService` (the core of this feature).
- `apps/web/src/services/calendar-sync.service.test.ts` — Vitest unit tests (mock `googleapis` + repos).
- `apps/web/src/app/api/businesses/[slug]/google-calendar/connect/route.ts` — `GET`: redirect owner to Google consent.
- `apps/web/src/app/api/businesses/[slug]/google-calendar/callback/route.ts` — `GET`: exchange code, store encrypted creds + calendar timezone, redirect to dashboard.
- `apps/web/src/app/api/businesses/[slug]/google-calendar/disconnect/route.ts` — `POST`: revoke + clear creds.
- `apps/web/src/app/api/businesses/[slug]/google-calendar/resync/route.ts` — `POST`: re-push failed/pending future bookings.
- `packages/db/migration_013_calendar_sync.sql` — New columns (sync status + calendar timezone).

### Files to Update
- `apps/web/src/repositories/booking.repo.ts` — add `setGoogleSync()`, `findForCalendarSync()`, `findPendingSyncForBusiness()`.
- `apps/web/src/repositories/business.repo.ts` — add `getGoogleCreds(businessId)`, `setGoogleCreds(...)`, `clearGoogleCreds(...)`.
- `apps/web/src/app/api/bookings/[id]/route.ts` — invoke `CalendarSyncService` alongside the notification calls (after 129).
- `apps/web/src/services/booking.service.ts` — push on creation for **Stripe-paid bookings that arrive already `confirmed`** (around the `notifyBusinessNewBooking` call at ~82).
- `apps/web/src/services/dashboard.service.ts` — surface `googleCalendarConnected: boolean` + `googleLastSyncedAt` (never expose the token) and include `google_sync_status` on booking rows.
- `apps/web/src/lib/types.ts` — extend `Booking` (133) with `googleEventId?`, `googleSyncStatus?`; add connection fields to the business dashboard type.
- `apps/web/src/lib/mappers.ts` — map the new snake_case columns.
- `apps/web/src/components/BusinessDashboard.tsx` — Connect / Synced·Re-sync control in the Calendar tab header; read `?gcal=connected|error` return param.
- `apps/web/src/components/dashboard/DailyAgenda.tsx` (+ booking card) — small per-booking sync indicator.
- `packages/db/setup.sql` — fold migration_013 into the consolidated schema.
- `apps/web/.env.local.example` + `CLAUDE.md` (Env Variables table + migrations list) — document new vars + migration_013.

### Documentation to Read
- [google-auth-library: generateAuthUrl & getToken](https://github.com/googleapis/google-auth-library-nodejs#oauth2)
  Why: exact `access_type:'offline'` + `prompt:'consent'` flags needed to *guarantee* a `refresh_token` on first consent.
- [Google Calendar API — events.insert](https://developers.google.com/calendar/api/v3/reference/events/insert)
  Why: event body shape; `start`/`end` accept `{ dateTime, timeZone }` — pass the stored calendar timezone so events land at the right hour.
- [events.patch](https://developers.google.com/calendar/api/v3/reference/events/patch) / [events.delete](https://developers.google.com/calendar/api/v3/reference/events/delete)
  Why: reschedule (patch by stored `google_event_id`) and cancel (delete; treat 404/410 as success — already gone).
- [calendars.get](https://developers.google.com/calendar/api/v3/reference/calendars/get)
  Why: read the calendar's `timeZone` once at connect time.
- [OAuth scopes — calendar.events](https://developers.google.com/calendar/api/auth)
  Why: confirms `calendar.events` is a **sensitive** scope (verification needed before GA) and that it grants read+write (so Phase 2 needs no re-consent).
- [Node crypto — createCipheriv (AES-256-GCM)](https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options)
  Why: encrypt-at-rest helper; GCM gives an auth tag we store alongside the ciphertext.

### Patterns to Follow
**Fire-safe side-effect method** (from `notification.service.ts:135-171`):
```ts
async pushOnConfirm(bookingId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) return
  try {
    // ...load creds + booking, call Google, persist event id + status...
  } catch (err) {
    console.error(`[calendar-sync] confirm push failed for ${bookingId}:`, err)
    // best-effort: mark the booking sync_status = 'failed' (also inside try/catch)
  }
}
```
**Connect route** (from `connect-stripe/route.ts`): config guard → look up business by slug → owner check (`decideAccess`) → build URL → return/redirect.
**Repo method** (from `booking.repo.ts:65-72`): `const db = createServerClient(); const { error } = await db.from('bookings').update({...}).eq('id', id); if (error) throw new Error(error.message)`.
**Config no-op gate** (from `email.ts:14-16`): a single `isXConfigured()` that the whole feature checks first.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation (schema, env, crypto, deps)
Add the new DB columns, the encryption helper, the Google config/env wiring, and the `googleapis` dependency. Nothing user-visible yet.

### Phase 2: Core (OAuth connect + sync service)
The OAuth connect/callback/disconnect routes (store encrypted refresh token + calendar timezone), and `CalendarSyncService` with create/update/delete. Repo methods to read creds and persist event id + sync status.

### Phase 3: Integration (hooks + UI)
Wire `CalendarSyncService` into the booking PATCH route and the paid-booking creation path. Add the Connect/Re-sync UI to the Calendar tab, the per-booking sync indicator, and the resync route. Surface connection state through the dashboard service.

### Phase 4: Testing & Validation
Unit-test the sync service (mock googleapis + repos), lint, build, and manually validate the full OAuth → confirm → reschedule → cancel → disconnect flow against a real test calendar.

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE `packages/db/migration_013_calendar_sync.sql`
- **IMPLEMENT**: `alter table bookings add column if not exists google_sync_status text check (google_sync_status in ('pending','synced','failed')); add column if not exists google_synced_at timestamptz;` and `alter table businesses add column if not exists google_calendar_timezone text;`
- **PATTERN**: Mirror the `add column if not exists` idempotent style in `migration_006_pre_launch.sql:142-152`.
- **GOTCHA**: `bookings.google_event_id` and the four `businesses.google_*` columns **already exist** (006) — do not redeclare them. Keep this migration additive and idempotent.
- **VALIDATE**: `grep -n "google_sync_status\|google_calendar_timezone" packages/db/migration_013_calendar_sync.sql`

### UPDATE `packages/db/setup.sql`
- **IMPLEMENT**: Fold the migration_013 columns into the consolidated schema near the existing Google block (around 557-567).
- **VALIDATE**: `grep -n "google_sync_status\|google_calendar_timezone" packages/db/setup.sql`

### CREATE `apps/web/src/lib/crypto.ts`
- **IMPLEMENT**: `encryptSecret(plain: string): string` and `decryptSecret(payload: string): string` using AES-256-GCM. Key from `process.env.GCAL_TOKEN_ENC_KEY` (base64-encoded 32 bytes). Output format `iv:authTag:ciphertext` (base64 parts joined by `:`).
- **IMPORTS**: `import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'`
- **GOTCHA**: Throw a clear error if the key is missing/not 32 bytes — but only when actually called, so the app still boots unconfigured. Never log plaintext.
- **VALIDATE**: `npx tsc --noEmit` (or rely on `npm run build`)

### CREATE `apps/web/src/lib/google-calendar.ts`
- **IMPLEMENT**: `isGoogleCalendarConfigured()` (true iff `GOOGLE_CLIENT_ID` && `GOOGLE_CLIENT_SECRET` && `GCAL_TOKEN_ENC_KEY`); `getOAuthClient(redirectUri)` returning a configured `google.auth.OAuth2`; `buildAuthUrl(client, state)` with `access_type:'offline'`, `prompt:'consent'`, `scope:['https://www.googleapis.com/auth/calendar.events']`; `getCalendarClient(refreshToken)` that sets credentials and returns `google.calendar({version:'v3', auth})`.
- **IMPORTS**: `import { google } from 'googleapis'`
- **PATTERN**: Mirror `email.ts:14-16` for the `isConfigured` gate.
- **GOTCHA**: `prompt:'consent'` is required or Google withholds the `refresh_token` on re-consent. The OAuth client auto-refreshes the access token from the refresh token — store only the refresh token.
- **VALIDATE**: `npm run lint`

### UPDATE `apps/web/src/repositories/business.repo.ts`
- **IMPLEMENT**: `getGoogleCreds(businessId)` → select `google_refresh_token, google_calendar_id, google_calendar_timezone`; `setGoogleCreds(businessId, { refreshTokenEnc, calendarId, timezone })` → update + `google_last_synced_at`; `clearGoogleCreds(businessId)` → null all four google_* creds columns.
- **PATTERN**: `booking.repo.ts:65-72` update shape.
- **GOTCHA**: Store the **encrypted** refresh token; callers decrypt via `decryptSecret`.
- **VALIDATE**: `npm run lint`

### UPDATE `apps/web/src/repositories/booking.repo.ts`
- **IMPLEMENT**: `findForCalendarSync(id)` → select `id, customer_name, customer_phone, booking_date, booking_time, status, google_event_id, business_id, services(name,duration), businesses(slug)` via the embed style in `findForNotification` (48-63); `setGoogleSync(id, { google_event_id, google_sync_status, google_synced_at })`; `findPendingSyncForBusiness(businessId)` → future bookings where `status='confirmed'` and `google_sync_status` is null or `'failed'`.
- **PATTERN**: `findForNotification` (48-63) for the join; `updateStatus` (65-72) for the writer.
- **GOTCHA**: `services` may have no `duration` column — verify; if absent, default event length to 60 min in the service layer rather than failing.
- **VALIDATE**: `npm run lint`

### CREATE `apps/web/src/services/calendar-sync.service.ts`
- **IMPLEMENT**: `CalendarSyncService` namespace object with fire-safe methods:
  - `pushOnConfirm(bookingId)`: load creds + booking; if no refresh token → return; build event (title `"{customer_name} — {service_name}"`, description with phone + "Booked via PLOI", `start/end` with stored timezone); if booking already has `google_event_id` → `events.patch`, else `events.insert`; persist `google_event_id` + `sync_status='synced'` + `google_synced_at`.
  - `updateOnReschedule(bookingId)`: same as confirm but always patch if `google_event_id` exists (insert if missing & confirmed).
  - `deleteOnCancel(bookingId)`: if `google_event_id` exists → `events.delete`; treat 404/410 as success; clear `google_event_id`, set `sync_status` null.
- **IMPORTS**: `getCalendarClient, isGoogleCalendarConfigured` from `@/lib/google-calendar`; `decryptSecret` from `@/lib/crypto`; `BookingRepo`, `BusinessRepo`.
- **PATTERN**: `notification.service.ts:129-171` — identical fire-safe skeleton (config guard, try/catch → `console.error`, namespace export). On failure, best-effort `BookingRepo.setGoogleSync(id, { google_sync_status: 'failed' })` inside its own guard.
- **GOTCHA**: Compose `dateTime` as `${booking_date}T${booking_time}` and pass `timeZone` from the business's `google_calendar_timezone` — do **not** rely on server local time. Never throw to the caller. Decline never reaches here (no event to delete) but `deleteOnCancel`'s no-event guard makes it safe anyway.
- **VALIDATE**: `npm run lint`

### CREATE `apps/web/src/app/api/businesses/[slug]/google-calendar/connect/route.ts`
- **IMPLEMENT**: `GET`. Config guard (400 if unconfigured). Resolve business by slug; owner check via `decideAccess`/`getAuthIdentity` (403/401 otherwise). Build redirect URI `${origin}/api/businesses/${slug}/google-calendar/callback`; `state` = signed/opaque value embedding slug (+ CSRF). `NextResponse.redirect(buildAuthUrl(...))`.
- **PATTERN**: `connect-stripe/route.ts` (config guard 12-17, slug lookup 22-27, origin 55) + `ownership.ts` for the auth gate.
- **GOTCHA**: This is a top-level browser navigation (link/redirect), not a POST fetch like Stripe — a `<a href>`/`window.location` from the UI hits this `GET` directly. Validate `state` on the callback to prevent CSRF.
- **VALIDATE**: `npm run build`

### CREATE `apps/web/src/app/api/businesses/[slug]/google-calendar/callback/route.ts`
- **IMPLEMENT**: `GET`. Read `code` + `state`; validate state → slug; exchange code via `oauthClient.getToken(code)`; require `tokens.refresh_token` (if absent, redirect with `?gcal=error&reason=no_refresh_token`); read the primary calendar's `timeZone` via `calendar.calendars.get({calendarId:'primary'})`; `BusinessRepo.setGoogleCreds(businessId, { refreshTokenEnc: encryptSecret(refresh_token), calendarId: 'primary', timezone })`; redirect to `/dashboard/business/${slug}?tab=calendar&gcal=connected`.
- **IMPORTS**: `getOAuthClient`, `getCalendarClient`/`google`, `encryptSecret`, `BusinessRepo`.
- **GOTCHA**: Missing `refresh_token` happens when the user previously consented without `prompt:'consent'` — our connect route forces consent, so this should be rare; still handle it. Wrap in try/catch and redirect with `?gcal=error` rather than dumping a 500.
- **VALIDATE**: `npm run build`

### CREATE `apps/web/src/app/api/businesses/[slug]/google-calendar/disconnect/route.ts`
- **IMPLEMENT**: `POST`. Owner check. Best-effort `oauthClient.revokeToken(refreshToken)` (ignore failure); `BusinessRepo.clearGoogleCreds(businessId)`. **Leave existing Google events untouched** (decision). Return `{ ok: true }`.
- **GOTCHA**: Revocation can fail if already revoked — swallow and still clear local creds.
- **VALIDATE**: `npm run build`

### CREATE `apps/web/src/app/api/businesses/[slug]/google-calendar/resync/route.ts`
- **IMPLEMENT**: `POST`. Owner check. `BookingRepo.findPendingSyncForBusiness(businessId)` → for each, `await CalendarSyncService.pushOnConfirm(b.id)`. Return `{ resynced: n, failed: m }`.
- **GOTCHA**: Bound the batch (e.g. future bookings only) so a huge backlog can't hang the request; the service is already fire-safe so one bad booking won't abort the loop.
- **VALIDATE**: `npm run build`

### UPDATE `apps/web/src/app/api/bookings/[id]/route.ts`
- **IMPLEMENT**: After the notification block (line 129), add fire-safe sync calls based on the same `update`: if `update.status === 'confirmed'` and `isBusinessOwner` → `CalendarSyncService.pushOnConfirm(id)`; if reschedule (`update.booking_date` set) → `CalendarSyncService.updateOnReschedule(id)`; if `update.status === 'declined' || 'cancelled'` → `CalendarSyncService.deleteOnCancel(id)`.
- **PATTERN**: Sit beside the existing `NotificationService` calls (122-129) — same `await`, same fire-safe contract.
- **IMPORTS**: `import { CalendarSyncService } from '@/services/calendar-sync.service'`
- **GOTCHA**: A confirm **and** reschedule can arrive in one PATCH — push (create) takes precedence; `pushOnConfirm` already patches if an event exists, so calling it alone covers both. Don't double-call.
- **VALIDATE**: `npm run build`

### UPDATE `apps/web/src/services/booking.service.ts`
- **IMPLEMENT**: For Stripe-paid bookings that are created already `confirmed` (near the `NotificationService.notifyBusinessNewBooking(..., { paid: true })` call ~line 82), also `await CalendarSyncService.pushOnConfirm(booking.id)`.
- **GOTCHA**: Only for the already-confirmed (paid) path — pending bookings must **not** be pushed until the owner confirms. Verify the exact branch before adding.
- **VALIDATE**: `npm run build`

### UPDATE `apps/web/src/services/dashboard.service.ts`, `lib/types.ts`, `lib/mappers.ts`
- **IMPLEMENT**: Expose `googleCalendarConnected: boolean` (derived: `!!google_refresh_token`) and `googleLastSyncedAt` on the business dashboard payload — **never** the token itself. Add `googleEventId?`/`googleSyncStatus?` to `Booking` (types.ts:133) and map them in `mappers.ts`. Ensure booking-fetch queries select `google_sync_status`.
- **GOTCHA**: Service-role client returns the token column; explicitly omit it from anything sent to the client. Expose only the boolean.
- **VALIDATE**: `npm run build`

### UPDATE `apps/web/src/components/BusinessDashboard.tsx`
- **IMPLEMENT**: In the Calendar tab header (174-191): if `!googleCalendarConnected` show **"Connect Google Calendar"** (an `<a href="/api/businesses/${slug}/google-calendar/connect">` — top-level nav, not fetch); if connected show "Google Calendar · synced {relative time}" + a **Re-sync** button (`fetch(.../resync, {method:'POST'})`, mirror the `connecting` state at 60-67). On mount, read `?gcal=connected|error` and show a toast/inline message.
- **PATTERN**: Connect-button + `connecting` state (60-67, 150-154).
- **GOTCHA**: Connect is `GET` navigation (OAuth redirect); Re-sync/disconnect are `POST` fetches. Don't conflate them.
- **VALIDATE**: `npm run build`

### UPDATE `apps/web/src/components/dashboard/DailyAgenda.tsx` (+ booking card)
- **IMPLEMENT**: Small icon/dot on each booking reflecting `googleSyncStatus`: synced (subtle check), failed (coral warning), pending/none (nothing). Only meaningful when the business is connected.
- **GOTCHA**: Keep it quiet per the design system — this is informational, not a coral CTA. Coral only for the *failed* state (a negative needing attention).
- **VALIDATE**: `npm run build`

### CREATE `apps/web/src/services/calendar-sync.service.test.ts`
- **IMPLEMENT**: `vi.mock` `@/lib/google-calendar`, `@/repositories/booking.repo`, `@/repositories/business.repo`. Cases: (1) unconfigured → no-op, no repo writes; (2) confirm with no existing event → `events.insert` called, `setGoogleSync('synced')`; (3) reschedule with existing event → `events.patch`; (4) cancel with event → `events.delete`, event id cleared; (5) cancel without event → no Google call; (6) Google throws → `setGoogleSync('failed')`, no rethrow.
- **PATTERN**: `apps/web/src/services/staff.service.test.ts` / `booking.service.test.ts` `vi.mock` style.
- **VALIDATE**: `npm run test`

### UPDATE docs: `apps/web/.env.local.example`, `CLAUDE.md`
- **IMPLEMENT**: Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GCAL_TOKEN_ENC_KEY` (with a note: base64 32-byte key, generate via `openssl rand -base64 32`). In `CLAUDE.md`, add migration_013 to the migrations list and the env vars to the table.
- **VALIDATE**: `grep -n "GCAL_TOKEN_ENC_KEY" apps/web/.env.local.example`

---

---

# PART B — PLOI Calendar UI (Schedule-X)

A real visual calendar in the dashboard Calendar tab — what users will call "the PLOI calendar". **Hybrid rendering:** Schedule-X grid on desktop (`md` and up), the existing mobile-first agendas (`DailyAgenda`/`WeeklyAgenda`/`MonthlyAgenda`) below `md`. Library: **Schedule-X** (MIT, TS-first, CSS-variable theming, React 19 compatible). Interactivity this phase: **click an event → booking details/actions; click an empty slot → existing Walk-in modal** (prefilled). Drag-to-reschedule is explicitly deferred.

### DECISIONS LOCKED (Part B)
- **Library:** Schedule-X — chosen for CSS-variable theming (maps onto `bridge-*` tokens), React 19 support, and light bundle vs FullCalendar.
- **Hybrid, not replace:** keep all three custom mobile agendas; add the grid for desktop only. No regressions on phone.
- **Interactivity:** event-click → details/actions; empty-slot-click → Walk-in modal. No drag/drop yet.
- **Status colors:** map Schedule-X per-calendar colors to the **retained semantic status colors** (green confirmed / amber pending / red cancelled/declined) — **not coral** (coral stays a guest; it's reserved for money/CTAs/positive, per design principles).
- **Sync crossover:** when Part A is live and a business is connected, each event shows a subtle `googleSyncStatus` indicator (coral only for the `failed` state — a negative needing attention).

### CONTEXT REFERENCES (Part B)

**Files to read before implementing:**
- `apps/web/src/components/BusinessDashboard.tsx` (lines 33-40, 51-73, 172-219) — `rangeBookings: AgendaBooking[]` is already fetched and passed in (34); the Calendar tab (172-219) is the mount point; `showWalkin` state + `setShowWalkin(true)` (60, 184) is the Walk-in trigger; views are URL-param driven (196-198); the whole dashboard is wrapped in `max-w-2xl mx-auto` (80) — **the grid must break out of this on desktop.**
- `apps/web/src/components/DailyAgenda.tsx` (whole file) — the mobile view to keep; `AgendaBooking` shape (`id, status, price, staffId, ...`) imported from `dashboard.service`; `BookingActionCard` (line 7, 123) is the existing detail/action card to reuse for desktop event-click.
- `apps/web/src/components/BookingActionCard.tsx` — reuse inside the desktop event detail popover/modal; also `colorForStaff` for staff coloring.
- `apps/web/src/components/WalkinModal.tsx` — the modal opened on empty-slot click; check its props to add optional `initialDate`/`initialTime`.
- `apps/web/src/services/dashboard.service.ts` — `AgendaBooking` definition (the event source); confirm it carries `bookingDate`, `bookingTime`, `customerName`, `serviceName`, `status`, and (after Part A) `googleSyncStatus`.
- `apps/web/src/app/globals.css` — where `:root` / `.dark` `bridge-*` CSS variables live; Schedule-X `--sx-*` vars get mapped here.

**New files to create (Part B):**
- `apps/web/src/components/PloiCalendar.tsx` — `'use client'` Schedule-X wrapper.
- `apps/web/src/lib/calendar-events.ts` — pure mapper `AgendaBooking[] → Schedule-X events`.
- `apps/web/src/lib/calendar-events.test.ts` — unit tests for the mapper.

**Files to update (Part B):**
- `apps/web/src/components/BusinessDashboard.tsx` — render `PloiCalendar` (`hidden md:block`) + existing agendas (`md:hidden`); widen the calendar tab container on desktop; wire empty-slot → `setShowWalkin`.
- `apps/web/src/components/WalkinModal.tsx` — accept optional `initialDate`/`initialTime`.
- `apps/web/src/app/globals.css` — `--sx-*` → `bridge-*` mapping for light + dark.

**Documentation to read (Part B):**
- [Schedule-X — React adapter](https://schedule-x.dev/docs/frameworks/react)
  Why: `useCalendarApp` + `ScheduleXCalendar` usage, and that the component must be a Client Component.
- [Schedule-X — views](https://schedule-x.dev/docs/calendar/views)
  Why: `createViewDay`, `createViewWeek`, `createViewMonthGrid`, `createViewMonthAgenda` — pick the desktop set.
- [Schedule-X — events & calendars (colors)](https://schedule-x.dev/docs/calendar/events)
  Why: event object shape (`{ id, title, start, end, calendarId }`, `start`/`end` as `'YYYY-MM-DD HH:mm'`) and per-`calendarId` color config for status colors.
- [Schedule-X — callbacks](https://schedule-x.dev/docs/calendar/configuration)
  Why: `onEventClick` and `onClickDateTime` / `onClickDate` for the two interactions.
- [Schedule-X — theming / dark mode](https://schedule-x.dev/docs/calendar/theming)
  Why: `--sx-*` CSS variables to override, and the `isDark` config flag.

### STEP-BY-STEP TASKS (Part B)

#### ADD Schedule-X dependencies
- **IMPLEMENT**: `npm i @schedule-x/react @schedule-x/calendar @schedule-x/theme-default @schedule-x/events-service @schedule-x/event-modal` (run in `apps/web`).
- **GOTCHA**: Confirm a clean install under React 19 (no forced `--legacy-peer-deps`). If a peer-dep wall appears, that's the signal to fall back to FullCalendar per the "Let me pick" escape hatch — surface it, don't silently `--force`.
- **VALIDATE**: `node -e "require('@schedule-x/react')"` and `npm run build`

#### CREATE `apps/web/src/lib/calendar-events.ts`
- **IMPLEMENT**: `agendaToScheduleXEvents(bookings: AgendaBooking[]): SxEvent[]`. For each: `id`, `title = \`${customerName} · ${serviceName}\``, `start = \`${bookingDate} ${bookingTime.slice(0,5)}\``, `end` = start + service `duration` minutes (default 60 if absent), `calendarId = status`, and a custom field `syncStatus` for the indicator.
- **PATTERN**: Pure function, no Supabase — like the helpers in `lib/mappers.ts`.
- **GOTCHA**: Schedule-X wants space-separated local datetimes `'YYYY-MM-DD HH:mm'`, **not** ISO `T`. Don't apply any timezone math here — these are wall-clock business-local times (same convention the agendas already use).
- **VALIDATE**: `npm run test` (via the test below)

#### CREATE `apps/web/src/components/PloiCalendar.tsx`
- **IMPLEMENT**: `'use client'`. `useCalendarApp({ views: [createViewDay(), createViewWeek(), createViewMonthGrid()], defaultView, selectedDate, events, calendars, callbacks, isDark })`; render `<ScheduleXCalendar calendarApp={...} />`. `calendars` maps each status → `{ colorName, lightColors, darkColors }` using the semantic status palette. `callbacks.onEventClick(evt)` → call `props.onEventClick(evt.id)`; `callbacks.onClickDateTime(dt)` → `props.onSlotClick(dt)`. Custom event content shows the status + a small `syncStatus` dot.
- **IMPORTS**: `import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react'`; `import { createViewDay, createViewWeek, createViewMonthGrid } from '@schedule-x/calendar'`; `import '@schedule-x/theme-default/dist/index.css'`.
- **GOTCHA**: Import the theme CSS once (here is fine). Schedule-X owns its internal nav state — let it own date/view navigation on desktop rather than fighting the URL params; the existing day/week/month toggle can call the calendar API to switch views, or simply be hidden on desktop where Schedule-X has its own header.
- **VALIDATE**: `npm run build`

#### UPDATE `apps/web/src/components/WalkinModal.tsx`
- **IMPLEMENT**: Accept optional `initialDate?: string` / `initialTime?: string` props and seed the form when present (used by empty-slot click).
- **GOTCHA**: Keep current default behavior when props are absent (the existing Walk-in button at `BusinessDashboard.tsx:184` passes nothing).
- **VALIDATE**: `npm run build`

#### UPDATE `apps/web/src/components/BusinessDashboard.tsx` (Calendar tab)
- **IMPLEMENT**: In the `tab === 'calendar'` block (172-219): wrap the existing day/week/month agendas in `<div className="md:hidden">` and add `<div className="hidden md:block"><PloiCalendar events={agendaToScheduleXEvents(rangeBookings)} selectedDate={viewDate} ... onEventClick={...} onSlotClick={(dt) => { setWalkinSlot(dt); setShowWalkin(true) }} /></div>`. Add a `walkinSlot` state to pass into `WalkinModal`. For desktop breathing room, widen this tab's container beyond the page's `max-w-2xl` (e.g. a `lg:max-w-5xl` wrapper *for the calendar tab only*).
- **PATTERN**: Walk-in trigger mirrors line 184 (`setShowWalkin(true)`); event-click opens a detail surface reusing `BookingActionCard`.
- **GOTCHA**: `PloiCalendar` is a Client Component (it already is — `BusinessDashboard` is `'use client'`). Don't break the mobile path: below `md`, behavior must be exactly as today.
- **VALIDATE**: `npm run build`

#### UPDATE `apps/web/src/app/globals.css`
- **IMPLEMENT**: Override Schedule-X `--sx-*` variables (surface, border, text, today-highlight, grid lines) to the `bridge-*` token values under both `:root` and `.dark`. Pass `isDark` to `useCalendarApp` based on the active theme so the calendar flips with the app.
- **GOTCHA**: Status event colors come from the `calendars` config (per-event), not these globals — keep the two concerns separate. Respect "warm, tinted neutrals — never pure black/white".
- **VALIDATE**: visual check in Level 4.

#### CREATE `apps/web/src/lib/calendar-events.test.ts`
- **IMPLEMENT**: Cases — duration→end offset (and 60-min default when duration missing); `status`→`calendarId`; time formatting (`14:30:00` → start `... 14:30`, space not `T`); title composition; `syncStatus` passthrough.
- **PATTERN**: Pure-function test; no mocks needed (unlike the service tests).
- **VALIDATE**: `npm run test`

---

## TESTING STRATEGY

### Unit Tests
`calendar-sync.service.test.ts` — all six cases above, fully mocked (no network). This is the safety net for the create/patch/delete branching and the fire-safe contract.
`calendar-events.test.ts` (Part B) — pure mapper: duration→end, status→calendarId, datetime formatting, sync passthrough.

### Integration Tests
No automated integration suite exists for external APIs in this repo; covered by manual validation against a real test calendar (below).

### Edge Cases
- Confirm a booking when the business is **not** connected → no-op, no error, booking confirms normally.
- Refresh token revoked on Google's side → push 401s → booking marked `failed`, indicator shows, booking flow unaffected.
- Reschedule a booking whose event was manually deleted in Google → patch 404 → fall back to insert (or mark failed gracefully).
- Cancel a booking that was never confirmed (no event) → delete is a safe no-op.
- Daylight-saving / cross-timezone: a Singapore vs Bangkok business → event lands at the correct local hour using stored `google_calendar_timezone`.
- Connect → disconnect → reconnect: stale `google_event_id`s remain on old events (left by design); new bookings create fresh events.

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
npm run lint
```

### Level 2: Unit Tests
```bash
npm run test
```

### Level 3: Build (type-check + compile)
```bash
npm run build
```

### Level 4: Manual Validation
1. Set `GOOGLE_CLIENT_ID/SECRET` (Google Cloud OAuth client, test mode) + `GCAL_TOKEN_ENC_KEY` in `apps/web/.env.local`; run `migration_013` in staging Supabase.
2. `npm run dev` → dashboard Calendar tab → **Connect Google Calendar** → complete consent → redirected back with `?gcal=connected`; header shows connected state.
3. Confirm a pending booking → event appears in Google Calendar at the right local time; booking card shows "synced".
4. Reschedule it → the **same** Google event moves (no duplicate).
5. Cancel it → event disappears from Google.
6. Temporarily break the token (or revoke in Google) → confirm another → booking shows "failed"; click **Re-sync** after restoring → it syncs.
7. **Disconnect** → creds cleared, existing events remain in Google, new confirms no longer sync.

**Part B (calendar UI):**
8. On desktop (`≥md`), the Calendar tab shows the Schedule-X grid; bookings appear at the right day/time with status colors (green/amber/red).
9. On a phone (`<md`), the existing day/week/month agendas render exactly as before — no regression.
10. Click an event → booking details/actions open (reusing `BookingActionCard`).
11. Click an empty slot → Walk-in modal opens prefilled with that date/time; saving creates the walk-in.
12. Toggle dark mode → the calendar re-themes to the dark `bridge-*` tokens.
13. With Part A connected, events show the sync indicator (coral only when `failed`).

---

## ACCEPTANCE CRITERIA
- [ ] Owner can connect a Google Calendar via OAuth from the Calendar tab (one-time).
- [ ] Confirming a booking creates a Google event at the correct local time; rescheduling updates it; cancelling/declining removes it.
- [ ] Stripe-paid (already-confirmed) bookings sync on creation.
- [ ] Refresh token is stored **encrypted**; the raw token is never sent to the browser.
- [ ] Per-booking sync status is visible; failures don't break the booking flow; Re-sync repairs them.
- [ ] Disconnect clears creds and stops syncing, leaving existing events in place.
- [ ] Unconfigured / unconnected = silent no-op; all existing booking flows unchanged.
- [ ] **(Part B)** Desktop shows the Schedule-X grid; mobile keeps the existing agendas with zero regression.
- [ ] **(Part B)** Event-click opens booking actions; empty-slot-click opens a prefilled Walk-in modal.
- [ ] **(Part B)** Calendar themes correctly in light + dark; status colors use semantic palette, not coral.
- [ ] `npm run lint`, `npm run test`, `npm run build` all pass.

---

## NOTES

### Design decisions & trade-offs
- **Why mirror `notification.service.ts`:** calendar sync is the same shape of problem (a non-critical side effect of a booking mutation) so it inherits the proven fire-safe contract — a Google outage can never block a confirm.
- **Why store the calendar timezone at connect** rather than reading per-push: avoids a Google API round-trip on every event and is robust to the server's own timezone. Honors the "derive from the calendar" decision while caching the result.
- **Why request `calendar.events` (read+write) now:** Phase 2 (read Google → suppress availability) needs read access; requesting the broader scope today means businesses won't have to re-consent later. Costs nothing in the pilot since verification is skipped regardless.
- **Encryption is a launch blocker** (explicit decision) — `lib/crypto.ts` ships in Phase 1, not deferred.

### Risks
1. **Silent drift** is the core threat for a booking tool. Mitigated by per-booking `google_sync_status` + a visible indicator — but only if the Calendar tab surfaces `failed` prominently; don't bury it.
2. **Token revocation / expiry** → pushes 401. Bookings mark `failed`; consider degrading the header to a "reconnect needed" state when creds are present but consistently failing (nice-to-have this phase).
3. **Google verification cliff:** the moment this goes past pilot (>100 users), Google's sensitive-scope review (privacy policy, domain verification, security assessment) gates it — start weeks before GA. Out of scope here but must be tracked.
4. **`googleapis` bundle size / Edge runtime:** it's Node-only — ensure these routes/services run on the Node runtime (they're server-side API routes, so default is fine), not Edge.

### Alternatives considered
- *Supabase's built-in Google login for calendar access* — rejected: it grants login scopes only, no offline refresh token for server-side calendar writes.
- *Per-staff calendars* — rejected for now: needs schema on staff and per-staff OAuth; the pilot uses one business calendar.
- *Manual-only sync button (no auto-push)* — rejected: stale until clicked, poor UX for a live booking system.

### PHASE 2 (NOT IN THIS PLAN — sketch only)
Read Google events back to suppress PLOI availability (prevent double-booking against external commitments). Brings `businesses.google_sync_token` alive (incremental sync), requires push webhooks **or** scheduled polling, event-type handling (all-day/recurring/free-vs-busy), and a conflict rule (a confirmed PLOI booking wins over an overlapping Google event). Open decisions parked: read infra (webhooks vs polling), which calendars to read (just the synced one vs all of the owner's), and how stale/laggy reads must avoid silently hiding bookable slots. Design as its own project once Phase 1 is proven.
