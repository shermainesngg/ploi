import { BookingRepo } from '@/repositories/booking.repo'
import { LinkRepo } from '@/repositories/link.repo'
import { LocationRepo } from '@/repositories/location.repo'
import { AttributionService } from './attribution.service'
import { NotificationService } from './notification.service'

export interface CreateBookingInput {
  serviceId: string
  businessId: string
  locationId?: string | null
  linkId?: string | null
  contentId?: string | null
  staffId?: string | null
  customerName: string
  customerContact: string
  customerEmail?: string | null
  customerPhone?: string | null
  bookingDate: string
  bookingTime: string
  isWalkin?: boolean
}

export const BookingService = {
  async create(input: CreateBookingInput) {
    // Always attribute a booking to a branch. If the caller didn't specify one
    // (e.g. flows that pre-date the location picker), fall back to the
    // business's primary location.
    let locationId = input.locationId ?? null
    if (!locationId) {
      const primary = await LocationRepo.findPrimaryByBusinessId(input.businessId)
      locationId = primary?.id ?? null
    }

    const attribution = await AttributionService.resolve({
      customerPhone: input.customerPhone ?? input.customerContact ?? null,
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
      location_id: locationId,
      link_id: attribution.effectiveLinkId,
      content_id: input.contentId ?? null,
      staff_id: input.staffId ?? null,
      customer_name: input.customerName,
      customer_contact: input.customerContact,
      customer_email: input.customerEmail ?? null,
      customer_phone: input.customerPhone ?? null,
      booking_date: input.bookingDate,
      booking_time: input.bookingTime,
      status: input.isWalkin ? 'confirmed' : 'pending',
      payment_status: input.isWalkin ? null : 'pending',
      is_walkin: input.isWalkin ?? false,
      acquisition_id: attribution.acquisitionId,
      is_repeat: attribution.isRepeat,
      commission_rate: attribution.commissionRate,
    })

    if (attribution.shouldCreateAcquisition && input.linkId && creatorId && input.customerPhone) {
      await AttributionService.createAcquisition({
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        customerName: input.customerName,
        businessId: input.businessId,
        creatorId,
        linkId: input.linkId,
        firstBookingId: booking.id,
      })
    }

    if (attribution.effectiveLinkId) {
      await AttributionService.recordBookingEvent(attribution.effectiveLinkId, booking.id)
    }

    // Walk-ins are entered by the business itself — no need to tell them.
    if (!input.isWalkin) {
      await NotificationService.notifyBusinessNewBooking(booking.id)
    }

    return { id: booking.id, status: booking.status }
  },

  async updateStatus(bookingId: string, status: 'confirmed' | 'declined') {
    await BookingRepo.updateStatus(bookingId, status)
  },
}
