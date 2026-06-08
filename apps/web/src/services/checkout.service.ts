import { getStripe, isStripeConfigured, calculatePlatformFee } from '@/lib/stripe'
import { isSupabaseConfigured } from '@/lib/supabase'
import { BookingRepo } from '@/repositories/booking.repo'
import { BusinessRepo } from '@/repositories/business.repo'
import { LinkRepo } from '@/repositories/link.repo'
import { LocationRepo } from '@/repositories/location.repo'
import { AttributionService } from './attribution.service'
import { StaffService } from './staff.service'

export interface CheckoutInput {
  serviceId: string
  businessId: string
  locationId?: string | null
  linkId?: string | null
  contentId?: string | null
  staffId?: string | null
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  bookingDate: string
  bookingTime: string
}

export type CheckoutResult =
  | { mode: 'stripe'; url: string | null; sessionId: string }
  | { mode: 'inapp'; booking: { id: string; status: string } }

export const CheckoutService = {
  async process(input: CheckoutInput, origin: string): Promise<CheckoutResult> {
    const [service, business] = await Promise.all([
      BusinessRepo.findServiceById(input.serviceId),
      BusinessRepo.findBusinessById(input.businessId),
    ])

    if (!service || !business) {
      throw new Error('Service or business not found')
    }

    // Resolve the branch: explicit choice, else the business's primary location.
    let locationId = input.locationId ?? null
    if (!locationId) {
      const primary = await LocationRepo.findPrimaryByBusinessId(business.id)
      locationId = primary?.id ?? null
    }
    const resolvedInput: CheckoutInput = { ...input, locationId }

    let resolvedStaffId: string | null = input.staffId ?? null
    if (!resolvedStaffId) {
      resolvedStaffId = await StaffService.pickEligibleStaff({
        businessId: business.id,
        serviceId: input.serviceId,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
        locationId,
      })
    }

    if (isStripeConfigured()) {
      return this.processStripeCheckout(resolvedInput, service, business, resolvedStaffId, origin)
    }

    return this.processInAppBooking(resolvedInput, resolvedStaffId)
  },

  async processStripeCheckout(
    input: CheckoutInput,
    service: { id: string; name: string; price: number },
    business: { id: string; slug: string; name: string; stripe_account_id: string | null },
    staffId: string | null,
    origin: string,
  ): Promise<CheckoutResult> {
    const stripe = getStripe()

    const attribution = await AttributionService.resolve({
      customerPhone: input.customerPhone ?? null,
      businessId: input.businessId,
      linkId: input.linkId ?? null,
    })

    let creatorId: string | null = null
    if (attribution.effectiveLinkId) {
      creatorId = await LinkRepo.findCreatorIdByLinkId(attribution.effectiveLinkId)
    }

    const booking = await BookingRepo.insert({
      service_id: input.serviceId,
      business_id: input.businessId,
      location_id: input.locationId ?? null,
      link_id: attribution.effectiveLinkId,
      content_id: input.contentId ?? null,
      staff_id: staffId,
      customer_name: input.customerName,
      customer_contact: input.customerEmail,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone ?? null,
      booking_date: input.bookingDate,
      booking_time: input.bookingTime,
      status: 'pending',
      payment_status: 'pending',
      is_walkin: false,
      acquisition_id: attribution.acquisitionId,
      is_repeat: attribution.isRepeat,
      commission_rate: attribution.commissionRate,
    })

    if (attribution.shouldCreateAcquisition && input.linkId && creatorId && input.customerPhone) {
      await AttributionService.createAcquisition({
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        businessId: input.businessId,
        creatorId,
        linkId: input.linkId,
        firstBookingId: booking.id,
      })
    }

    const amountCents = service.price * 100
    const lineItems = [
      {
        quantity: 1,
        price_data: {
          currency: 'thb',
          unit_amount: amountCents,
          product_data: {
            name: service.name,
            description: `${business.name} · ${input.bookingDate} ${input.bookingTime}`,
          },
        },
      },
    ]

    const successUrl = `${origin}/booking-confirmed/${booking.id}?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/`

    let session
    if (business.stripe_account_id) {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: input.customerEmail,
        payment_intent_data: {
          application_fee_amount: calculatePlatformFee(amountCents),
          transfer_data: { destination: business.stripe_account_id },
          metadata: { booking_id: booking.id, link_id: input.linkId ?? '' },
        },
        metadata: { booking_id: booking.id, business_slug: business.slug },
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
    } else {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: input.customerEmail,
        payment_intent_data: {
          metadata: { booking_id: booking.id, link_id: input.linkId ?? '', no_connected_account: 'true' },
        },
        metadata: { booking_id: booking.id, business_slug: business.slug },
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
    }

    await BookingRepo.updateStripeSession(booking.id, session.id)

    return { mode: 'stripe', url: session.url, sessionId: session.id }
  },

  async processInAppBooking(
    input: CheckoutInput,
    staffId: string | null,
  ): Promise<CheckoutResult> {
    const { BookingService } = await import('./booking.service')
    const booking = await BookingService.create({
      serviceId: input.serviceId,
      businessId: input.businessId,
      locationId: input.locationId,
      linkId: input.linkId,
      contentId: input.contentId,
      staffId,
      customerName: input.customerName,
      customerContact: input.customerEmail,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      bookingDate: input.bookingDate,
      bookingTime: input.bookingTime,
    })
    return { mode: 'inapp', booking }
  },
}
