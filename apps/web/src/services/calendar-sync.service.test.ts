import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted so the vi.mock factory below can reference these (vi.mock is hoisted
// above imports). They stand in for the googleapis calendar client's methods.
const { mockInsert, mockPatch, mockDelete, mockGetCalendarClient } = vi.hoisted(() => {
  const mockInsert = vi.fn()
  const mockPatch = vi.fn()
  const mockDelete = vi.fn()
  const mockGetCalendarClient = vi.fn(() => ({
    events: { insert: mockInsert, patch: mockPatch, delete: mockDelete },
  }))
  return { mockInsert, mockPatch, mockDelete, mockGetCalendarClient }
})

vi.mock('@/lib/google-calendar', () => ({
  isGoogleCalendarConfigured: vi.fn(() => true),
  getCalendarClient: mockGetCalendarClient,
}))

vi.mock('@/lib/crypto', () => ({
  decryptSecret: vi.fn((s: string) => `decrypted:${s}`),
}))

vi.mock('@/repositories/booking.repo', () => ({
  BookingRepo: {
    findForCalendarSync: vi.fn(),
    setGoogleSync: vi.fn(),
  },
}))

vi.mock('@/repositories/business.repo', () => ({
  BusinessRepo: {
    getGoogleCreds: vi.fn(),
  },
}))

import { CalendarSyncService } from './calendar-sync.service'
import { isGoogleCalendarConfigured } from '@/lib/google-calendar'
import { BookingRepo } from '@/repositories/booking.repo'
import { BusinessRepo } from '@/repositories/business.repo'

const mockConfigured = vi.mocked(isGoogleCalendarConfigured)
const mockBookingRepo = vi.mocked(BookingRepo)
const mockBusinessRepo = vi.mocked(BusinessRepo)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bookingRow(overrides: Record<string, any> = {}) {
  return {
    id: 'bk-1',
    customer_name: 'May K.',
    customer_phone: '+66812345678',
    booking_date: '2026-06-10',
    booking_time: '14:30:00',
    status: 'confirmed',
    google_event_id: null,
    business_id: 'biz-1',
    services: { name: 'Gel Manicure', duration: 60 },
    businesses: { slug: 'thai-glow' },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockConfigured.mockReturnValue(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockBusinessRepo.getGoogleCreds.mockResolvedValue({
    google_refresh_token: 'enc-token',
    google_calendar_id: 'primary',
    google_calendar_timezone: 'Asia/Bangkok',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  mockInsert.mockResolvedValue({ data: { id: 'evt-new' } })
  mockPatch.mockResolvedValue({ data: { id: 'evt-existing' } })
  mockDelete.mockResolvedValue({})
})

describe('CalendarSyncService', () => {
  it('is a no-op when Google Calendar is not configured', async () => {
    mockConfigured.mockReturnValue(false)
    await CalendarSyncService.pushOnConfirm('bk-1')
    expect(mockBookingRepo.findForCalendarSync).not.toHaveBeenCalled()
    expect(mockBookingRepo.setGoogleSync).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('is a no-op when the business has no refresh token (not connected)', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(bookingRow())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockBusinessRepo.getGoogleCreds.mockResolvedValue({ google_refresh_token: null } as any)
    await CalendarSyncService.pushOnConfirm('bk-1')
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockBookingRepo.setGoogleSync).not.toHaveBeenCalled()
  })

  it('inserts a new event on confirm and marks synced (correct local time + tz)', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(bookingRow())
    await CalendarSyncService.pushOnConfirm('bk-1')

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockPatch).not.toHaveBeenCalled()
    const arg = mockInsert.mock.calls[0][0]
    expect(arg.calendarId).toBe('primary')
    expect(arg.requestBody.start).toEqual({ dateTime: '2026-06-10T14:30:00', timeZone: 'Asia/Bangkok' })
    expect(arg.requestBody.end).toEqual({ dateTime: '2026-06-10T15:30:00', timeZone: 'Asia/Bangkok' })
    expect(arg.requestBody.summary).toContain('May K.')
    expect(mockBookingRepo.setGoogleSync).toHaveBeenCalledWith(
      'bk-1',
      expect.objectContaining({ google_event_id: 'evt-new', google_sync_status: 'synced' }),
    )
  })

  it('defaults the event to 60 minutes when the service has no duration', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(
      bookingRow({ services: { name: 'Consult', duration: null } }),
    )
    await CalendarSyncService.pushOnConfirm('bk-1')
    expect(mockInsert.mock.calls[0][0].requestBody.end.dateTime).toBe('2026-06-10T15:30:00')
  })

  it('patches the existing event on reschedule', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(bookingRow({ google_event_id: 'evt-existing' }))
    await CalendarSyncService.updateOnReschedule('bk-1')

    expect(mockPatch).toHaveBeenCalledTimes(1)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockPatch.mock.calls[0][0].eventId).toBe('evt-existing')
    expect(mockBookingRepo.setGoogleSync).toHaveBeenCalledWith(
      'bk-1',
      expect.objectContaining({ google_sync_status: 'synced' }),
    )
  })

  it('deletes the event on cancel and clears the event id', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(
      bookingRow({ google_event_id: 'evt-existing', status: 'cancelled' }),
    )
    await CalendarSyncService.deleteOnCancel('bk-1')

    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockDelete.mock.calls[0][0].eventId).toBe('evt-existing')
    expect(mockBookingRepo.setGoogleSync).toHaveBeenCalledWith('bk-1', {
      google_event_id: null,
      google_sync_status: null,
      google_synced_at: null,
    })
  })

  it('treats a 404/410 on delete as success (event already gone)', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(
      bookingRow({ google_event_id: 'evt-gone', status: 'cancelled' }),
    )
    mockDelete.mockRejectedValue({ code: 404 })
    await CalendarSyncService.deleteOnCancel('bk-1')

    // No failure marker — the booking is cleared as if the delete succeeded.
    expect(mockBookingRepo.setGoogleSync).toHaveBeenCalledWith('bk-1', {
      google_event_id: null,
      google_sync_status: null,
      google_synced_at: null,
    })
  })

  it('is a no-op on cancel when there is no event (e.g. a declined booking)', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(
      bookingRow({ google_event_id: null, status: 'cancelled' }),
    )
    await CalendarSyncService.deleteOnCancel('bk-1')
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockBookingRepo.setGoogleSync).not.toHaveBeenCalled()
  })

  it('marks the booking failed (without throwing) when Google errors', async () => {
    mockBookingRepo.findForCalendarSync.mockResolvedValue(bookingRow())
    mockInsert.mockRejectedValue(new Error('quota exceeded'))

    await expect(CalendarSyncService.pushOnConfirm('bk-1')).resolves.toBeUndefined()
    expect(mockBookingRepo.setGoogleSync).toHaveBeenCalledWith('bk-1', { google_sync_status: 'failed' })
  })
})
