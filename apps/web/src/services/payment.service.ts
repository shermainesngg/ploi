import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { BookingRepo } from '@/repositories/booking.repo'

export type RefundResult = 'refunded' | 'skipped' | 'failed'

export const PaymentService = {
  /**
   * Fully refund a paid booking's card payment.
   *
   * - Destination charges (business has a connected account) are refunded with
   *   `reverse_transfer` + `refund_application_fee`, so the business's share
   *   and PLOI's fee are both pulled back.
   * - Returns 'skipped' when there's nothing to refund (Stripe unconfigured,
   *   booking unpaid, or no payment intent) and 'failed' on a Stripe error —
   *   callers treat the refund as best-effort and surface the result.
   */
  async refundBookingPayment(bookingId: string): Promise<RefundResult> {
    if (!isStripeConfigured()) return 'skipped'

    const booking = await BookingRepo.findById(bookingId)
    if (!booking || booking.payment_status !== 'paid' || !booking.stripe_payment_intent_id) {
      return 'skipped'
    }

    try {
      const stripe = getStripe()
      const intent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)
      const isDestinationCharge = !!intent.transfer_data?.destination

      await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        ...(isDestinationCharge
          ? { reverse_transfer: true, refund_application_fee: true }
          : {}),
      })

      await BookingRepo.updatePaymentStatus(bookingId, { payment_status: 'refunded' })
      return 'refunded'
    } catch (err) {
      console.error(`[payment] refund failed for booking ${bookingId}:`, err)
      return 'failed'
    }
  },
}
