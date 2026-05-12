import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AttributionService } from './attribution.service'

vi.mock('@/repositories/attribution.repo', () => ({
  AttributionRepo: {
    findActiveAcquisition: vi.fn(),
    markAcquisitionInactive: vi.fn(),
    insertAcquisition: vi.fn(),
    insertEvent: vi.fn(),
  },
}))

vi.mock('@/repositories/booking.repo', () => ({
  BookingRepo: {
    updateAcquisitionId: vi.fn(),
  },
}))

import { AttributionRepo } from '@/repositories/attribution.repo'
import { BookingRepo } from '@/repositories/booking.repo'

const mockAttRepo = vi.mocked(AttributionRepo)
const mockBookingRepo = vi.mocked(BookingRepo)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AttributionService.resolve', () => {
  const businessId = '00000000-0000-0000-0000-000000000001'
  const linkId = '00000000-0000-0000-0000-000000000002'

  it('returns no attribution when phone is empty', async () => {
    const result = await AttributionService.resolve({
      customerPhone: null,
      businessId,
      linkId: null,
    })
    expect(result).toEqual({
      acquisitionId: null,
      effectiveLinkId: null,
      isRepeat: false,
      commissionRate: null,
      shouldCreateAcquisition: false,
    })
  })

  it('returns 10% commission with linkId but no phone', async () => {
    const result = await AttributionService.resolve({
      customerPhone: null,
      businessId,
      linkId,
    })
    expect(result.commissionRate).toBe(0.10)
    expect(result.effectiveLinkId).toBe(linkId)
    expect(result.shouldCreateAcquisition).toBe(false)
  })

  it('returns repeat attribution when active acquisition exists', async () => {
    mockAttRepo.findActiveAcquisition.mockResolvedValue({
      id: 'acq-1',
      creatorId: 'creator-1',
      linkId: 'original-link',
      customerPhone: '66812345678',
      acquiredAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-07-01T00:00:00Z',
    })

    const result = await AttributionService.resolve({
      customerPhone: '0812345678',
      businessId,
      linkId: 'new-link',
    })

    expect(result.isRepeat).toBe(true)
    expect(result.commissionRate).toBe(0.05)
    expect(result.effectiveLinkId).toBe('original-link')
    expect(result.acquisitionId).toBe('acq-1')
    expect(result.shouldCreateAcquisition).toBe(false)
  })

  it('returns first-booking attribution when no acquisition and link provided', async () => {
    mockAttRepo.findActiveAcquisition.mockResolvedValue(null)

    const result = await AttributionService.resolve({
      customerPhone: '0812345678',
      businessId,
      linkId,
    })

    expect(result.isRepeat).toBe(false)
    expect(result.commissionRate).toBe(0.10)
    expect(result.shouldCreateAcquisition).toBe(true)
    expect(result.effectiveLinkId).toBe(linkId)
  })

  it('returns unattributed when no acquisition and no link', async () => {
    mockAttRepo.findActiveAcquisition.mockResolvedValue(null)

    const result = await AttributionService.resolve({
      customerPhone: '0812345678',
      businessId,
      linkId: null,
    })

    expect(result.isRepeat).toBe(false)
    expect(result.commissionRate).toBeNull()
    expect(result.shouldCreateAcquisition).toBe(false)
    expect(result.effectiveLinkId).toBeNull()
  })
})

describe('AttributionService.findActiveAcquisition', () => {
  it('returns null when no acquisition found', async () => {
    mockAttRepo.findActiveAcquisition.mockResolvedValue(null)
    const result = await AttributionService.findActiveAcquisition('66812345678', 'biz-1')
    expect(result).toBeNull()
  })

  it('marks expired acquisition inactive and returns null', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString()
    mockAttRepo.findActiveAcquisition.mockResolvedValue({
      id: 'acq-expired',
      creatorId: 'creator-1',
      linkId: 'link-1',
      customerPhone: '66812345678',
      acquiredAt: '2025-01-01T00:00:00Z',
      expiresAt: pastDate,
    })

    const result = await AttributionService.findActiveAcquisition('66812345678', 'biz-1')

    expect(result).toBeNull()
    expect(mockAttRepo.markAcquisitionInactive).toHaveBeenCalledWith('acq-expired')
  })

  it('returns valid non-expired acquisition', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString()
    const acq = {
      id: 'acq-valid',
      creatorId: 'creator-1',
      linkId: 'link-1',
      customerPhone: '66812345678',
      acquiredAt: '2026-01-01T00:00:00Z',
      expiresAt: futureDate,
    }
    mockAttRepo.findActiveAcquisition.mockResolvedValue(acq)

    const result = await AttributionService.findActiveAcquisition('66812345678', 'biz-1')
    expect(result).toEqual(acq)
  })
})

describe('AttributionService.createAcquisition', () => {
  it('returns null for empty phone', async () => {
    const result = await AttributionService.createAcquisition({
      customerPhone: '',
      customerName: 'Test',
      businessId: 'biz-1',
      creatorId: 'creator-1',
      linkId: 'link-1',
      firstBookingId: 'booking-1',
    })
    expect(result).toBeNull()
    expect(mockAttRepo.insertAcquisition).not.toHaveBeenCalled()
  })

  it('inserts acquisition and backfills booking', async () => {
    mockAttRepo.insertAcquisition.mockResolvedValue('new-acq-id')

    const result = await AttributionService.createAcquisition({
      customerPhone: '0812345678',
      customerEmail: 'test@test.com',
      customerName: 'Test User',
      businessId: 'biz-1',
      creatorId: 'creator-1',
      linkId: 'link-1',
      firstBookingId: 'booking-1',
    })

    expect(result).toBe('new-acq-id')
    expect(mockAttRepo.insertAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_phone: '66812345678',
        business_id: 'biz-1',
        creator_id: 'creator-1',
      }),
    )
    expect(mockBookingRepo.updateAcquisitionId).toHaveBeenCalledWith('booking-1', 'new-acq-id')
  })
})

describe('AttributionService.recordBookingEvent', () => {
  it('inserts attribution event', async () => {
    await AttributionService.recordBookingEvent('link-1', 'booking-1')
    expect(mockAttRepo.insertEvent).toHaveBeenCalledWith({
      link_id: 'link-1',
      booking_id: 'booking-1',
      event_type: 'booking_confirmed',
    })
  })
})
