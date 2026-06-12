import { describe, it, expect } from 'vitest'
import { agendaToScheduleXEvents } from './calendar-events'
import type { AgendaBooking } from '@/services/dashboard.service'

function booking(overrides: Partial<AgendaBooking> = {}): AgendaBooking {
  return {
    id: 'bk-1',
    serviceId: 'svc-1',
    serviceName: 'Gel Manicure',
    serviceDuration: 60,
    customerName: 'May K.',
    customerEmail: null,
    customerPhone: null,
    date: '2026-06-10',
    time: '14:30:00',
    endTime: '15:30',
    status: 'confirmed',
    isWalkin: false,
    price: 800,
    creator: null,
    staffId: null,
    staffName: null,
    isRepeat: false,
    acquiredBy: null,
    googleSyncStatus: null,
    createdAt: null,
    rescheduleProposedDate: null,
    rescheduleProposedTime: null,
    rescheduleProposalLive: false,
    ...overrides,
  }
}

describe('agendaToScheduleXEvents', () => {
  it('formats start/end as space-separated local datetimes (not ISO T)', () => {
    const [e] = agendaToScheduleXEvents([booking()])
    expect(e.start).toBe('2026-06-10 14:30')
    expect(e.end).toBe('2026-06-10 15:30')
    expect(e.start).not.toContain('T')
  })

  it('offsets end by the service duration', () => {
    const [e] = agendaToScheduleXEvents([booking({ serviceDuration: 90 })])
    expect(e.end).toBe('2026-06-10 16:00')
  })

  it('defaults to a 60-minute event when duration is missing/zero', () => {
    // serviceDuration coerced to 0 → falls back to 60 via `?? 60`? 0 is falsy but
    // not null/undefined, so guard explicitly: missing duration uses the default.
    const [e] = agendaToScheduleXEvents([
      booking({ serviceDuration: undefined as unknown as number }),
    ])
    expect(e.end).toBe('2026-06-10 15:30')
  })

  it('rolls over to the next day when an appointment crosses midnight', () => {
    const [e] = agendaToScheduleXEvents([
      booking({ time: '23:30:00', serviceDuration: 60 }),
    ])
    expect(e.start).toBe('2026-06-10 23:30')
    expect(e.end).toBe('2026-06-11 00:30')
  })

  it('maps booking status to calendarId', () => {
    expect(agendaToScheduleXEvents([booking({ status: 'pending' })])[0].calendarId).toBe('pending')
    expect(agendaToScheduleXEvents([booking({ status: 'cancelled' })])[0].calendarId).toBe('cancelled')
  })

  it('composes the title from customer + service', () => {
    expect(agendaToScheduleXEvents([booking()])[0].title).toBe('May K. · Gel Manicure')
  })

  it('passes the google sync status through for the indicator', () => {
    expect(agendaToScheduleXEvents([booking({ googleSyncStatus: 'failed' })])[0].syncStatus).toBe('failed')
    expect(agendaToScheduleXEvents([booking({ googleSyncStatus: 'synced' })])[0].syncStatus).toBe('synced')
  })

  it('passes customer/service/walk-in/repeat fields through for the rich renderer', () => {
    const [e] = agendaToScheduleXEvents([
      booking({ customerName: 'Pim S.', serviceName: 'Balayage', isWalkin: true, isRepeat: true }),
    ])
    expect(e.customerName).toBe('Pim S.')
    expect(e.serviceName).toBe('Balayage')
    expect(e.isWalkin).toBe(true)
    expect(e.isRepeat).toBe(true)
  })

  it('handles HH:mm time strings (no seconds) too', () => {
    const [e] = agendaToScheduleXEvents([booking({ time: '09:00' })])
    expect(e.start).toBe('2026-06-10 09:00')
    expect(e.end).toBe('2026-06-10 10:00')
  })
})
