import { describe, it, expect } from 'vitest'
import { isProposalLive, proposalDeadline, RESCHEDULE_PROPOSAL_TTL_HOURS } from './reschedule'
import type { ProposalRow } from './reschedule'

/** Local-wall-clock epoch ms — matches how the helper parses dates/times. */
function ms(local: string): number {
  return new Date(local).getTime()
}

function row(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    reschedule_proposed_date: '2026-06-20',
    reschedule_proposed_time: '14:00',
    reschedule_proposed_at: '2026-06-19T10:00:00',
    ...overrides,
  }
}

describe('proposalDeadline', () => {
  it('is capped by the 24h TTL when the appointment is far off', () => {
    // proposedAt + 24h = 2026-06-20T10:00; proximity (appt − 1h) = 2026-06-20T13:00.
    const deadline = proposalDeadline('2026-06-19T10:00:00', '2026-06-20', '14:00')
    expect(deadline).toBe(ms('2026-06-20T10:00:00'))
    expect(RESCHEDULE_PROPOSAL_TTL_HOURS).toBe(24)
  })

  it('is capped by appointment proximity when the proposal is made close to the slot', () => {
    // proposedAt + 24h = 2026-06-21T11:30; proximity (appt − 1h) = 2026-06-20T13:00 wins.
    const deadline = proposalDeadline('2026-06-20T11:30:00', '2026-06-20', '14:00')
    expect(deadline).toBe(ms('2026-06-20T13:00:00'))
  })
})

describe('isProposalLive', () => {
  it('is live within the 24h window', () => {
    expect(isProposalLive(row(), ms('2026-06-19T12:00:00'))).toBe(true)
  })

  it('is expired after the 24h TTL even though the appointment has not arrived', () => {
    expect(isProposalLive(row(), ms('2026-06-20T11:00:00'))).toBe(false)
  })

  it('is expired past (appointment − buffer) even when less than 24h old', () => {
    const r = row({ reschedule_proposed_at: '2026-06-20T11:30:00' })
    // 12:00 is before the 13:00 proximity deadline → still live...
    expect(isProposalLive(r, ms('2026-06-20T12:00:00'))).toBe(true)
    // ...13:30 is past it, only 2h after the proposal was made → expired.
    expect(isProposalLive(r, ms('2026-06-20T13:30:00'))).toBe(false)
  })

  it('is not live when there is no proposed date', () => {
    expect(isProposalLive(row({ reschedule_proposed_date: null }), ms('2026-06-19T12:00:00'))).toBe(false)
  })

  it('is not live when the proposed time or timestamp is missing', () => {
    expect(isProposalLive(row({ reschedule_proposed_time: null }), ms('2026-06-19T12:00:00'))).toBe(false)
    expect(isProposalLive(row({ reschedule_proposed_at: null }), ms('2026-06-19T12:00:00'))).toBe(false)
  })
})
