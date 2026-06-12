/**
 * Single source of truth for reschedule-proposal validity.
 *
 * A business-proposed reschedule lives as an overlay on a still-`pending`
 * booking (the `reschedule_proposed_*` columns from migration_016). The proposal
 * "holds" the proposed slot — but only for a bounded window so it can't tie up
 * inventory forever. Liveness is *computed* from the columns, never trusted from
 * their raw presence: an expired proposal stops blocking automatically and the
 * stale columns are cleared opportunistically on the next mutation (no worker).
 *
 * Pure time math (mirrors `availability.ts` `timeToMinutes`). Never reads
 * `Date.now()` at module scope — callers pass `now` in for testability.
 */

/** How long a proposed slot is held before it lapses (Booking.com's 24h model). */
export const RESCHEDULE_PROPOSAL_TTL_HOURS = 24

/** Shape of the proposal columns this module reasons about. */
export interface ProposalRow {
  reschedule_proposed_date: string | null
  reschedule_proposed_time: string | null
  reschedule_proposed_at: string | null
}

const HOUR_MS = 60 * 60 * 1000

/**
 * Epoch ms at which a live proposal lapses:
 *   min(proposedAt + TTL, proposedDateTime − bufferHours)
 *
 * The TTL caps how long the customer can sit on it; the appointment-proximity
 * term stops a proposal from staying "live" right up to (or past) the slot
 * itself. The proposed datetime is built as **local** wall-clock to match how
 * `availability.ts` treats slots.
 */
export function proposalDeadline(
  proposedAt: string,
  proposedDate: string,
  proposedTime: string,
  bufferHours = 1,
): number {
  const ttlDeadline = new Date(proposedAt).getTime() + RESCHEDULE_PROPOSAL_TTL_HOURS * HOUR_MS
  // `HH:MM` or `HH:MM:SS` — Date parses both as local when no zone is present.
  const proposedDateTime = new Date(`${proposedDate}T${proposedTime}`).getTime()
  const proximityDeadline = proposedDateTime - bufferHours * HOUR_MS
  return Math.min(ttlDeadline, proximityDeadline)
}

/**
 * True when a proposal is outstanding AND still within its hold window. A null
 * proposed date (or missing time/timestamp) means no live proposal.
 */
export function isProposalLive(row: ProposalRow, now: number = Date.now()): boolean {
  if (!row.reschedule_proposed_date || !row.reschedule_proposed_time || !row.reschedule_proposed_at) {
    return false
  }
  return now < proposalDeadline(
    row.reschedule_proposed_at,
    row.reschedule_proposed_date,
    row.reschedule_proposed_time,
  )
}
