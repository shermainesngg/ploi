import { AttributionRepo } from '@/repositories/attribution.repo'
import { BookingRepo } from '@/repositories/booking.repo'
import { normalizePhone } from '@/lib/phone'

export interface AttributionResult {
  acquisitionId: string | null
  effectiveLinkId: string | null
  isRepeat: boolean
  commissionRate: number | null
  shouldCreateAcquisition: boolean
}

export const AttributionService = {
  async resolve(opts: {
    customerPhone: string | null
    businessId: string
    linkId: string | null
  }): Promise<AttributionResult> {
    const phone = normalizePhone(opts.customerPhone ?? '')

    if (!phone) {
      return {
        acquisitionId: null,
        effectiveLinkId: opts.linkId ?? null,
        isRepeat: false,
        commissionRate: opts.linkId ? 0.10 : null,
        shouldCreateAcquisition: false,
      }
    }

    const existing = await this.findActiveAcquisition(phone, opts.businessId)
    if (existing) {
      return {
        acquisitionId: existing.id,
        effectiveLinkId: existing.linkId,
        isRepeat: true,
        commissionRate: 0.05,
        shouldCreateAcquisition: false,
      }
    }

    if (opts.linkId) {
      return {
        acquisitionId: null,
        effectiveLinkId: opts.linkId,
        isRepeat: false,
        commissionRate: 0.10,
        shouldCreateAcquisition: true,
      }
    }

    return {
      acquisitionId: null,
      effectiveLinkId: null,
      isRepeat: false,
      commissionRate: null,
      shouldCreateAcquisition: false,
    }
  },

  async findActiveAcquisition(phone: string, businessId: string) {
    const acquisition = await AttributionRepo.findActiveAcquisition(phone, businessId)
    if (!acquisition) return null

    if (new Date(acquisition.expiresAt) < new Date()) {
      await AttributionRepo.markAcquisitionInactive(acquisition.id)
      return null
    }

    return acquisition
  },

  async createAcquisition(opts: {
    customerPhone: string
    customerEmail?: string | null
    customerName: string
    businessId: string
    creatorId: string
    linkId: string
    firstBookingId: string
  }): Promise<string | null> {
    const phone = normalizePhone(opts.customerPhone)
    if (!phone) return null

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 6)

    const acquisitionId = await AttributionRepo.insertAcquisition({
      customer_phone: phone,
      customer_email: opts.customerEmail ?? null,
      customer_name: opts.customerName,
      business_id: opts.businessId,
      creator_id: opts.creatorId,
      link_id: opts.linkId,
      first_booking_id: opts.firstBookingId,
      expires_at: expiresAt.toISOString(),
    })

    if (acquisitionId) {
      await BookingRepo.updateAcquisitionId(opts.firstBookingId, acquisitionId)
    }

    return acquisitionId
  },

  async recordBookingEvent(linkId: string, bookingId: string) {
    await AttributionRepo.insertEvent({
      link_id: linkId,
      booking_id: bookingId,
      event_type: 'booking_confirmed',
    })
  },
}
