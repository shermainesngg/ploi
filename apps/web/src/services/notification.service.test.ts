import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService } from './notification.service'

vi.mock('@/repositories/booking.repo', () => ({
  BookingRepo: {
    findForNotification: vi.fn(),
  },
}))

vi.mock('@/lib/email', () => ({
  isEmailConfigured: vi.fn(),
  sendEmail: vi.fn(),
}))

import { BookingRepo } from '@/repositories/booking.repo'
import { isEmailConfigured, sendEmail } from '@/lib/email'

const mockRepo = vi.mocked(BookingRepo)
const mockConfigured = vi.mocked(isEmailConfigured)
const mockSend = vi.mocked(sendEmail)

const baseRow = {
  id: 'booking-1',
  customer_name: 'Nina',
  customer_email: 'nina@example.com',
  booking_date: '2026-06-12',
  booking_time: '10:30:00',
  status: 'pending',
  payment_status: 'pending',
  is_walkin: false,
  services: { name: 'Signature Glow Facial', price: 1890 },
  businesses: { name: 'Glow Studio', slug: 'glowstudio', email: 'hello@glow.example', location: 'Bangkok' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfigured.mockReturnValue(true)
  mockSend.mockResolvedValue(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockRepo.findForNotification.mockResolvedValue(baseRow as any)
})

describe('NotificationService.notifyBusinessNewBooking', () => {
  it('emails the business about a pending request', async () => {
    await NotificationService.notifyBusinessNewBooking('booking-1')
    expect(mockSend).toHaveBeenCalledTimes(1)
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('hello@glow.example')
    expect(call.subject).toContain('New booking request')
    expect(call.html).toContain('Signature Glow Facial')
    expect(call.html).toContain('dashboard/business/glowstudio')
  })

  it('uses paid copy for Stripe-paid bookings', async () => {
    await NotificationService.notifyBusinessNewBooking('booking-1', { paid: true })
    expect(mockSend.mock.calls[0][0].subject).toContain('New paid booking')
  })

  it('does nothing when email is not configured', async () => {
    mockConfigured.mockReturnValue(false)
    await NotificationService.notifyBusinessNewBooking('booking-1')
    expect(mockRepo.findForNotification).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('skips silently when the business has no email', async () => {
    mockRepo.findForNotification.mockResolvedValue({
      ...baseRow,
      businesses: { ...baseRow.businesses, email: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    await NotificationService.notifyBusinessNewBooking('booking-1')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('never throws when the repo fails', async () => {
    mockRepo.findForNotification.mockRejectedValue(new Error('db down'))
    await expect(NotificationService.notifyBusinessNewBooking('booking-1')).resolves.toBeUndefined()
  })
})

describe('NotificationService.notifyCustomerStatusChange', () => {
  it('emails the customer on confirmation', async () => {
    await NotificationService.notifyCustomerStatusChange('booking-1', 'confirmed')
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('nina@example.com')
    expect(call.subject).toContain('Booking confirmed')
    expect(call.html).toContain('booking-confirmed/booking-1')
  })

  it('emails the customer on decline', async () => {
    await NotificationService.notifyCustomerStatusChange('booking-1', 'declined')
    expect(mockSend.mock.calls[0][0].subject).toContain('Booking declined')
  })

  it('skips when the booking has no customer email', async () => {
    mockRepo.findForNotification.mockResolvedValue({
      ...baseRow,
      customer_email: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    await NotificationService.notifyCustomerStatusChange('booking-1', 'confirmed')
    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('NotificationService.notifyBusinessCancellation', () => {
  it('emails the business when the customer cancels', async () => {
    await NotificationService.notifyBusinessCancellation('booking-1')
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('hello@glow.example')
    expect(call.subject).toContain('Booking cancelled')
    expect(call.html).toContain('Nina')
  })

  it('handles array-shaped Supabase embeds', async () => {
    mockRepo.findForNotification.mockResolvedValue({
      ...baseRow,
      services: [baseRow.services],
      businesses: [baseRow.businesses],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    await NotificationService.notifyBusinessCancellation('booking-1')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
