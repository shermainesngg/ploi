import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRetrieve = vi.fn()
const mockRefundCreate = vi.fn()

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: vi.fn(() => true),
  getStripe: vi.fn(() => ({
    paymentIntents: { retrieve: mockRetrieve },
    refunds: { create: mockRefundCreate },
  })),
}))

vi.mock('@/repositories/booking.repo', () => ({
  BookingRepo: {
    findById: vi.fn(),
    updatePaymentStatus: vi.fn(),
  },
}))

import { PaymentService } from './payment.service'
import { BookingRepo } from '@/repositories/booking.repo'
import { isStripeConfigured } from '@/lib/stripe'

const mockRepo = vi.mocked(BookingRepo)
const mockConfigured = vi.mocked(isStripeConfigured)

const paidBooking = {
  id: 'booking-1',
  payment_status: 'paid',
  stripe_payment_intent_id: 'pi_123',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfigured.mockReturnValue(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockRepo.findById.mockResolvedValue(paidBooking as any)
  mockRetrieve.mockResolvedValue({ transfer_data: null })
  mockRefundCreate.mockResolvedValue({ id: 're_1' })
})

describe('PaymentService.refundBookingPayment', () => {
  it('refunds a plain (non-connected) charge and marks the booking refunded', async () => {
    const result = await PaymentService.refundBookingPayment('booking-1')
    expect(result).toBe('refunded')
    expect(mockRefundCreate).toHaveBeenCalledWith({ payment_intent: 'pi_123' })
    expect(mockRepo.updatePaymentStatus).toHaveBeenCalledWith('booking-1', { payment_status: 'refunded' })
  })

  it('reverses the transfer and application fee for destination charges', async () => {
    mockRetrieve.mockResolvedValue({ transfer_data: { destination: 'acct_biz' } })
    const result = await PaymentService.refundBookingPayment('booking-1')
    expect(result).toBe('refunded')
    expect(mockRefundCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_123',
      reverse_transfer: true,
      refund_application_fee: true,
    })
  })

  it('skips when Stripe is not configured', async () => {
    mockConfigured.mockReturnValue(false)
    expect(await PaymentService.refundBookingPayment('booking-1')).toBe('skipped')
    expect(mockRepo.findById).not.toHaveBeenCalled()
  })

  it('skips unpaid bookings', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRepo.findById.mockResolvedValue({ ...paidBooking, payment_status: 'pending' } as any)
    expect(await PaymentService.refundBookingPayment('booking-1')).toBe('skipped')
    expect(mockRefundCreate).not.toHaveBeenCalled()
  })

  it('returns failed (without throwing) when Stripe errors', async () => {
    mockRefundCreate.mockRejectedValue(new Error('stripe down'))
    expect(await PaymentService.refundBookingPayment('booking-1')).toBe('failed')
    expect(mockRepo.updatePaymentStatus).not.toHaveBeenCalled()
  })
})
