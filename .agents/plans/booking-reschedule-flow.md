# Booking & Rescheduling Flow (Customer ↔ Business)

> Plan generated with the `plan-feature` methodology. Design decisions follow the
> Airbnb / Booking.com **reservation-alteration** pattern where this repo had no
> precedent (confirmed by competitive research, 2026-06).

---

## 1. Feature Description & User Story

End-to-end booking lifecycle between a **customer** and a **business**, with a
first-class **business-proposed reschedule** for pending bookings.

- **As a customer**, I book a slot; it is held while the business decides, and if
  the business can't do my time they propose an alternative I can accept or
  decline — without me losing my original request or getting silently moved.
- **As a business**, I can confirm, decline, or **propose a new time** for a
  pending booking; the proposed slot is held briefly so it can't vanish before
  the customer answers, and stale requests clean themselves up.

The booking is only ever `pending`, `confirmed`, or `declined`. A reschedule
proposal is a **pending overlay** on a `pending` booking (extra columns), never a
mutation of the live record — so the original stays valid until the customer
accepts, exactly as Airbnb/Booking.com do.

---

## 2. Problem / Solution

**Problem.** A flat confirm/decline loses customers (and the creator commission
attached to the booking) whenever the requested time doesn't work. A naive
"business just moves it" silently overrides the customer's commitment and — in
the half-built version — can **double-book**, because the accept path writes the
proposed slot with no availability re-check, and the proposed slot is never held.

**Solution.** Keep the propose→accept handshake (validated as the Airbnb/Booking.com
pattern), and close the three gaps the grill surfaced:
1. **Re-validate availability at accept time** (correctness — must never double-book).
2. **Hold the proposed slot** for a bounded window (24h) so accept is safe, then
   **expire** the proposal (lazy/computed — no worker infra) and revert.
3. **Surface the proposal in-app** (logged-in `/bookings`) in addition to the
   token email link, and **disable Propose when there's no email** to reach the
   customer.

---

## 3. Feature Metadata

| | |
|---|---|
| **Type** | Feature (extends existing booking domain) |
| **Complexity** | **Medium** — touches availability engine + 2 API routes + 2 UI surfaces; no new tables |
| **Systems affected** | Availability engine, bookings API, dashboard cards, customer bookings page, notifications |
| **New tables / migrations** | **None** — reuses `bookings.reschedule_*` columns from `migration_016` |
| **Status** | ~70% built (handshake, columns, modal, emails, customer page). This plan covers the **whole flow** and specifies the remaining delta. |

---

## 4. Context References

### Already built (this flow — verify, don't rebuild)
- `packages/db/migration_016_reschedule_proposals.sql` — `reschedule_proposed_date/_time/_at`, `reschedule_token`.
- `apps/web/src/app/api/bookings/[id]/propose-reschedule/route.ts` — business-only propose (needs server-side availability check added).
- `apps/web/src/app/api/bookings/[id]/reschedule-response/route.ts` — token accept/decline (needs expiry + re-validate added).
- `apps/web/src/components/RescheduleModal.tsx` — `mode='propose'` + disclaimer.
- `apps/web/src/components/RescheduleResponse.tsx` — customer accept/decline buttons.
- `apps/web/src/app/booking/[id]/reschedule/page.tsx` — tokenised customer page.
- `apps/web/src/services/notification.service.ts` — `notifyCustomerRescheduleProposed`, `notifyBusinessRescheduleResponse`.
- `apps/web/src/components/BookingActionCard.tsx` — propose mode, "Xh to respond" chip, "Reschedule sent" chip.

### Files to read before implementing
- `apps/web/src/lib/availability.ts` — the slot engine. **Two booking-occupancy paths**: staff path (`staffBookings` query ~L194, intervals built ~L222) and business-wide path (`bookingQuery` ~L244, intervals ~L253). Both filter `.in('status', ['pending','confirmed'])` — this is *why* pending already blocks slots.
- `apps/web/src/app/api/bookings/[id]/route.ts` — PATCH handler; already clears proposal columns on status change (L84–L93). Direct reschedule for **confirmed** bookings lives here (L98–L107).
- `apps/web/src/app/bookings/page.tsx` — customer bookings (inline `select`, L25–L33) → `BookingsList`.
- `apps/web/src/components/BookingsList.tsx` — customer-facing list (add banner here).
- `apps/web/src/lib/constants.ts` — commission constants; add the TTL constant here.
- `apps/web/src/services/dashboard.service.ts` — `AgendaBooking` carries `createdAt`, `rescheduleProposedDate/Time` (L60–L74 + mappers).

### Patterns to follow
- **Pure helper + co-located vitest** — mirror `apps/web/src/lib/calendar-events.ts` + `calendar-events.test.ts`.
- **Fire-safe notifications** — every method try/catches and no-ops when unconfigured (`notification.service.ts`).
- **Capability-by-UUID** — `booking-confirmed/[id]` reads by id with no auth; the token tightens this for the state-changing path.
- **Availability intervals** — `overlaps(a,b)` + `timeToMinutes` already in `availability.ts`.

### External references (decision rationale)
- **Airbnb alteration** — original reservation stays intact until accepted; decline/no-response reverts; one pending change at a time. ([help/1504](https://www.airbnb.com/help/article/1504), [help/50](https://www.airbnb.com/help/article/50))
- **Booking.com date-change** — *holds the proposed slot* and **expires in 24h**, then reverts. This is the model we adopt for slot-hold + expiry. (partner help: "availability will be blocked for the new dates… approve within 24 hours")

---

## 5. Implementation Plan (phased)

**Design decision — how the proposed slot is held (no new table):** teach the
availability engine to treat a **live** `reschedule_proposed_date/_time` as an
occupied interval (same mechanism that already blocks `pending` bookings). A
proposal is "live" while `now < min(reschedule_proposed_at + 24h, proposedDateTime − buffer)`.
Past that it is **computed-expired**: the engine ignores it (slot released), the
card shows "Proposal expired", and accept returns 410. No cron, no worker — the
columns are cleared opportunistically on the next mutation. (Rejected
alternative: minting `time_blocks` rows — needs an expiry column + cleanup job;
the booking already carries the proposed slot, so the engine read is simpler and
self-cleaning.)

- **Phase A — Correctness core (blocking):** shared expiry/validity helper; accept-path expiry check + availability re-validate; propose-path server-side availability check.
- **Phase B — Hold the proposed slot:** extend the availability engine (both paths) to add live proposed intervals and ignore expired ones.
- **Phase C — Customer in-app surface:** proposal banner on `/bookings`, reusing `RescheduleResponse`.
- **Phase D — Business guard:** disable Propose when no `customer_email`; show "Proposal expired" state.
- **Phase E — Attribution invariant + tests.**

---

## 6. Step-by-Step Tasks (ordered by dependency)

### CREATE `apps/web/src/lib/reschedule.ts`
- **IMPLEMENT**: Single source of truth for proposal validity.
  - `export const RESCHEDULE_PROPOSAL_TTL_HOURS = 24`
  - `proposalDeadline(proposedAt: string, proposedDate: string, proposedTime: string, bufferHours = 1): number` → epoch ms = `min(proposedAt + TTL, proposedDateTime − bufferHours)`.
  - `isProposalLive(row, now = Date.now()): boolean` → true when `reschedule_proposed_date` set AND `now < proposalDeadline(...)`. Accepts a `{ reschedule_proposed_date, reschedule_proposed_time, reschedule_proposed_at }`-shaped object.
- **PATTERN**: pure functions like `apps/web/src/lib/calendar-events.ts`; time math like `availability.ts` `timeToMinutes`.
- **IMPORTS**: none (stdlib `Date`).
- **GOTCHA**: build the proposed datetime as **local** (`new Date(\`${date}T${time}\`)`) to match how `availability.ts` treats slots; never use `Date.now()` at module top-level (pass `now` in for testability).
- **VALIDATE**: `npx vitest run src/lib/reschedule.test.ts`

### CREATE `apps/web/src/lib/reschedule.test.ts`
- **IMPLEMENT**: cases — live within 24h; expired after 24h; expired because past `proposedDateTime − buffer` even if <24h old; null proposed_date → not live.
- **PATTERN**: `calendar-events.test.ts` fixture style; pass explicit `now`.
- **VALIDATE**: `npx vitest run src/lib/reschedule.test.ts`

### UPDATE `apps/web/src/app/api/bookings/[id]/reschedule-response/route.ts`  *(critical)*
- **IMPLEMENT**:
  - After loading the booking, **reject if `!isProposalLive(booking)`** → `410 { error: 'This reschedule link is no longer valid.' }` (covers expiry, not just token mismatch).
  - On `accept`, **re-validate availability** for the proposed slot before moving: call `getAvailableSlots(businessSlug, proposedDate, serviceId, staffId)` and confirm the proposed time is `available`. If not → `409 { error: 'That time was just taken — the business will suggest another.' }` and **leave the proposal intact** (so the business can re-propose) OR clear it and notify business (decide: clear + notify, mirrors Booking.com lapse). Recommended: clear proposal, notify business "proposed slot no longer free".
  - Keep existing accept behaviour (move date/time, `status='confirmed'`, clear proposal, `CalendarSyncService.pushOnConfirm`).
- **PATTERN**: availability usage as in `RescheduleModal` fetch; auth/lookup already in this file.
- **IMPORTS**: `getAvailableSlots` from `@/lib/availability`; `isProposalLive` from `@/lib/reschedule`. Need `businesses(slug)`, `service_id`, `staff_id` in the booking select.
- **GOTCHA**: the proposed booking has a `staff_id` — pass it so re-validation is per-staff, not business-wide. Re-validation must run **server-side** (don't trust the client).
- **VALIDATE**: `npm run build` + manual: propose, externally book the slot, then accept → expect 409.

### UPDATE `apps/web/src/app/api/bookings/[id]/propose-reschedule/route.ts`
- **IMPLEMENT**: before writing the proposal, **server-side availability check** of the chosen slot (defense in depth — the modal already filters, but the API must not trust input). Reject `409` if not available.
- **IMPORTS**: `getAvailableSlots`. Select `service_id`, `staff_id`, `businesses(slug)`.
- **GOTCHA**: the booking's own original slot is occupied by itself; exclude it isn't needed here since the proposed slot ≠ original. Per-staff check using the booking's `staff_id`.
- **VALIDATE**: `npm run build`.

### UPDATE `apps/web/src/lib/availability.ts`  *(hold the proposed slot)*
- **IMPLEMENT**: add proposed-slot occupancy in **both** paths.
  - **Staff path** (~L194): add a query for bookings on this date-as-proposed:
    `bookings` where `staff_id in ids` AND `reschedule_proposed_date = dateISO` AND `status='pending'`, selecting `staff_id, reschedule_proposed_time, reschedule_proposed_at, reschedule_proposed_date, services(duration, buffer_minutes)`. For each, **only if `isProposalLive(row)`**, push an interval at `reschedule_proposed_time` into that staff's `bookings` array.
  - **Business-wide path** (~L244): same, scoped by `business_id` (+ `location_id` when set), pushed into `bookedIntervals`.
- **PATTERN**: copy the existing interval mapping (`timeToMinutes(reschedule_proposed_time)` + duration + buffer); reuse `overlaps`.
- **IMPORTS**: `isProposalLive` from `@/lib/reschedule`.
- **GOTCHA**: filter expired proposals **in code** via `isProposalLive` (don't try to express the `min(...)` deadline in SQL). This is the lazy-expiry mechanism — an expired proposal stops blocking automatically. Keep the existing `pending/confirmed` original-slot query unchanged (original stays held too, per Booking.com).
- **VALIDATE**: `npx vitest run` (availability has no test today — add one if time) + manual: propose 4pm, reload availability for that day → 4pm shows unavailable; wait past deadline (or backdate `reschedule_proposed_at`) → 4pm free again.

### UPDATE `apps/web/src/services/dashboard.service.ts`
- **IMPLEMENT**: the card's "proposal pending" state must be **expiry-aware**. Either (a) add a derived `rescheduleProposedAt` to `AgendaBooking` and let the card compute liveness, or (b) compute `rescheduleProposalLive: boolean` in the mappers via `isProposalLive` and expose that. Prefer (b) — keep time logic in the helper.
  - Add `reschedule_proposed_at` to the four agenda selects; set `rescheduleProposalLive` in `mapAgendaBooking` and the two inline mappers.
- **IMPORTS**: `isProposalLive`.
- **GOTCHA**: server computes `isProposalLive` at request time — fine (server `Date` allowed). The card already mount-guards its own clock for the countdown.
- **VALIDATE**: `npx tsc --noEmit`.

### UPDATE `apps/web/src/components/BookingActionCard.tsx`
- **IMPLEMENT**:
  - **Disable "Propose new time" when `!booking.customerEmail`**; replace with a hint row: "No email on file — call the customer to rearrange." (use `customerPhone` `tel:` chip already present).
  - Use `booking.rescheduleProposalLive` (from service) instead of raw `rescheduleProposedDate` for the "Reschedule sent" chip; when a proposal exists but is **not** live, show "Proposal expired" (muted) instead.
- **PATTERN**: existing chip/badge block (~L193–L230) and contact chips.
- **GOTCHA**: keep the mount-guarded countdown; only the *liveness* decision moves to the server flag.
- **VALIDATE**: `npx tsc --noEmit`.

### UPDATE `apps/web/src/app/bookings/page.tsx` + `apps/web/src/components/BookingsList.tsx`  *(in-app surface)*
- **IMPLEMENT**:
  - Add `reschedule_proposed_date, reschedule_proposed_time, reschedule_proposed_at, reschedule_token` to the customer bookings `select` (page.tsx L27).
  - In `BookingsList`, for any booking with a **live** proposal, render a coral banner: original (struck) vs proposed time + reuse `<RescheduleResponse bookingId token />` (the row carries `reschedule_token`, so the same endpoint path works for the logged-in customer — no endpoint change).
- **PATTERN**: `RescheduleResponse` already self-contained; `booking/[id]/reschedule/page.tsx` layout for the original-vs-proposed block.
- **IMPORTS**: `RescheduleResponse`, `isProposalLive`.
- **GOTCHA**: only show for live proposals; after accept/decline the component shows its own done-state. The customer here is authenticated (page redirects to login), but acceptance still flows through the token — acceptable (capability the customer legitimately holds).
- **VALIDATE**: `npm run build` + manual: log in as the customer, propose from the business side, see the banner, accept in-app.

### UPDATE `apps/web/src/app/api/bookings/[id]/reschedule-response/route.ts` (attribution comment)
- **IMPLEMENT**: add a comment at the accept branch: *"Reschedule mutates this same booking row — `link_id` / acquisition lineage and commission tier stay frozen. Never reimplement as cancel-and-rebook (would re-trigger first-vs-repeat attribution)."*
- **VALIDATE**: n/a (doc).

---

## 7. Testing Strategy

- **Unit (`reschedule.test.ts`)** — liveness: within window; expired by TTL; expired by appointment-proximity cap; null proposal.
- **Unit (availability)** — add a focused test: a live proposed slot blocks; an expired one (backdated `reschedule_proposed_at`) does not. Mock the Supabase client like existing service tests.
- **Integration / manual (edge cases):**
  1. Propose → customer accepts → booking moves + confirmed; original slot freed, proposed slot now a real booking.
  2. Propose → external party books the proposed slot → customer accept → **409**, no double-book.
  3. Propose → 24h passes (or backdate) → slot auto-frees; card shows "Proposal expired"; token link returns 410.
  4. Propose → customer declines → booking back to plain `pending` at original time; business emailed.
  5. Business directly confirms while a proposal is outstanding → proposal cleared (existing PATCH behaviour); stale token → 410.
  6. Pending booking with **no email** → Propose disabled; phone chip shown.
  7. Logged-in customer sees the proposal banner on `/bookings` and accepts in-app.

---

## 8. Validation Commands

```bash
# From apps/web
npx tsc --noEmit -p tsconfig.json          # types
npx vitest run src/lib/reschedule.test.ts  # new helper
npx vitest run                              # full suite (booking/notification/calendar/availability)
npm run build                               # routes + RSC compile
```

Manual: run the 7 edge-case scenarios above against staging (confirm `.env.local` → staging first).

---

## 9. Acceptance Criteria

- [ ] Accepting a proposal **re-validates availability server-side**; a taken slot yields a clear error and never double-books.
- [ ] A live proposal **holds the proposed slot** in the availability engine (staff and business-wide paths).
- [ ] A proposal **auto-expires at `min(24h, appointment − buffer)`** with no worker: slot frees, card shows "Proposal expired", token link returns 410. Never auto-confirms.
- [ ] The **original booking stays valid** throughout; decline/expire returns it to `pending` at the original time (Airbnb/Booking.com invariant).
- [ ] Customer can accept/decline from **both** the token email link **and** the logged-in `/bookings` banner.
- [ ] "Propose new time" is **disabled when no `customer_email`**, with a call-the-customer hint.
- [ ] Attribution (`link_id`, acquisition, commission tier) is **unchanged** by any reschedule; comment documents the invariant.
- [ ] `npx tsc --noEmit`, `npx vitest run`, and `npm run build` all pass.

---

## 10. Notes (decisions, trade-offs, risks)

**Decisions**
- **Keep the propose→accept handshake.** Validated as the Airbnb + Booking.com reservation-alteration pattern; not exotic.
- **Proposal = overlay on `pending`, not a new status.** Matches the "original stays valid until accepted" invariant and avoids touching all status-switch logic.
- **Hold via the availability engine reading proposal columns, not `time_blocks`.** No migration, self-cleaning via computed expiry.
- **Lazy/computed 24h expiry** (Booking.com value) capped by appointment proximity. No cron — chosen for zero infra; a scheduled cleanup of stale columns can be added later but isn't required for correctness.
- **Accept stays token-authorised even in-app.** The logged-in customer holds the token legitimately; reusing one path keeps the endpoint simple. (If audit/security later demands it, add an authenticated branch that matches `customer_email`.)

**Trade-offs**
- Holding **both** original and proposed slots for ≤24h ties up two slots per proposal — bounded by the expiry, accepted per Booking.com. Revisit if inventory starvation shows up.
- Token-link acceptance is a capability bearer (not authenticated mutation). Acceptable for a non-financial time change; flagged if scope later includes paid reschedules.

**Risks**
- **Email deliverability** still gates the no-account customer path even with the in-app banner — monitor.
- **Availability engine is hot** (every slot view): the extra proposed-slot query adds one round-trip per path. Keep it a single indexed query (`reschedule_proposed_date = date`); add an index on `reschedule_proposed_date` if it shows up in profiling.
- **Confirmed-booking direct reschedule** (existing PATCH path) still moves a confirmed appointment with **no customer email** notification — out of scope here but worth a follow-up: it silently changes a committed appointment.
- **Lingering expired columns** until the next mutation — cosmetic only; liveness is always computed, never trusted from raw presence.
