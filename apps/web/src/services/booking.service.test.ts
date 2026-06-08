import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingService } from './booking.service'

vi.mock('@/repositories/booking.repo', () => ({
  BookingRepo: {
    insert: vi.fn(),
    updateStatus: vi.fn(),
    updateAcquisitionId: vi.fn(),
  },
}))

vi.mock('@/repositories/link.repo', () => ({
  LinkRepo: {
    findCreatorIdByLinkId: vi.fn(),
  },
}))

vi.mock('./attribution.service', () => ({
  AttributionService: {
    resolve: vi.fn(),
    createAcquisition: vi.fn(),
    recordBookingEvent: vi.fn(),
  },
}))

vi.mock('./notification.service', () => ({
  NotificationService: {
    notifyBusinessNewBooking: vi.fn(),
    notifyCustomerStatusChange: vi.fn(),
    notifyBusinessCancellation: vi.fn(),
  },
}))

import { BookingRepo } from '@/repositories/booking.repo'
import { LinkRepo } from '@/repositories/link.repo'
import { AttributionService } from './attribution.service'

const mockBookingRepo = vi.mocked(BookingRepo)
const mockLinkRepo = vi.mocked(LinkRepo)
const mockAttribution = vi.mocked(AttributionService)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BookingService.create', () => {
  const baseInput = {
    serviceId: 'svc-1',
    businessId: 'biz-1',
    customerName: 'Test User',
    customerContact: 'test@test.com',
    customerEmail: 'test@test.com',
    customerPhone: '0812345678',
    bookingDate: '2026-05-15',
    bookingTime: '10:00',
  }

  it('creates an unattributed booking', async () => {
    mockAttribution.resolve.mockResolvedValue({
      acquisitionId: null,
      effectiveLinkId: null,
      isRepeat: false,
      commissionRate: null,
      shouldCreateAcquisition: false,
    })
    mockBookingRepo.insert.mockResolvedValue({ id: 'booking-1', status: 'pending' })

    const result = await BookingService.create(baseInput)

    expect(result).toEqual({ id: 'booking-1', status: 'pending' })
    expect(mockBookingRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        service_id: 'svc-1',
        business_id: 'biz-1',
        link_id: null,
        commission_rate: null,
        is_repeat: false,
      }),
    )
    expect(mockAttribution.createAcquisition).not.toHaveBeenCalled()
    expect(mockAttribution.recordBookingEvent).not.toHaveBeenCalled()
  })

  it('creates a first-time attributed booking with acquisition', async () => {
    mockAttribution.resolve.mockResolvedValue({
      acquisitionId: null,
      effectiveLinkId: 'link-1',
      isRepeat: false,
      commissionRate: 0.10,
      shouldCreateAcquisition: true,
    })
    mockLinkRepo.findCreatorIdByLinkId.mockResolvedValue('creator-1')
    mockBookingRepo.insert.mockResolvedValue({ id: 'booking-2', status: 'pending' })

    const result = await BookingService.create({
      ...baseInput,
      linkId: 'link-1',
    })

    expect(result).toEqual({ id: 'booking-2', status: 'pending' })
    expect(mockBookingRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        link_id: 'link-1',
        commission_rate: 0.10,
        is_repeat: false,
      }),
    )
    expect(mockAttribution.createAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({
        customerPhone: '0812345678',
        businessId: 'biz-1',
        creatorId: 'creator-1',
        linkId: 'link-1',
        firstBookingId: 'booking-2',
      }),
    )
    expect(mockAttribution.recordBookingEvent).toHaveBeenCalledWith('link-1', 'booking-2')
  })

  it('creates a repeat booking with 5% commission', async () => {
    mockAttribution.resolve.mockResolvedValue({
      acquisitionId: 'acq-1',
      effectiveLinkId: 'original-link',
      isRepeat: true,
      commissionRate: 0.05,
      shouldCreateAcquisition: false,
    })
    mockLinkRepo.findCreatorIdByLinkId.mockResolvedValue('creator-1')
    mockBookingRepo.insert.mockResolvedValue({ id: 'booking-3', status: 'pending' })

    const result = await BookingService.create(baseInput)

    expect(result).toEqual({ id: 'booking-3', status: 'pending' })
    expect(mockBookingRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        link_id: 'original-link',
        acquisition_id: 'acq-1',
        is_repeat: true,
        commission_rate: 0.05,
      }),
    )
    expect(mockAttribution.createAcquisition).not.toHaveBeenCalled()
    expect(mockAttribution.recordBookingEvent).toHaveBeenCalledWith('original-link', 'booking-3')
  })

  it('does not create acquisition when no phone', async () => {
    mockAttribution.resolve.mockResolvedValue({
      acquisitionId: null,
      effectiveLinkId: 'link-1',
      isRepeat: false,
      commissionRate: 0.10,
      shouldCreateAcquisition: true,
    })
    mockLinkRepo.findCreatorIdByLinkId.mockResolvedValue('creator-1')
    mockBookingRepo.insert.mockResolvedValue({ id: 'booking-4', status: 'pending' })

    await BookingService.create({
      ...baseInput,
      linkId: 'link-1',
      customerPhone: undefined,
    })

    expect(mockAttribution.createAcquisition).not.toHaveBeenCalled()
  })
})

describe('BookingService.updateStatus', () => {
  it('delegates to BookingRepo.updateStatus', async () => {
    await BookingService.updateStatus('booking-1', 'confirmed')
    expect(mockBookingRepo.updateStatus).toHaveBeenCalledWith('booking-1', 'confirmed')
  })

  it('delegates declined status', async () => {
    await BookingService.updateStatus('booking-2', 'declined')
    expect(mockBookingRepo.updateStatus).toHaveBeenCalledWith('booking-2', 'declined')
  })
})
