import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocationService } from './location.service'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
}))

vi.mock('@/repositories/location.repo', () => ({
  LocationRepo: {
    listByBusinessId: vi.fn(),
    findById: vi.fn(),
    findPrimaryByBusinessId: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    updatePrimaryByBusinessId: vi.fn(),
    deactivate: vi.fn(),
    countActiveByBusinessId: vi.fn(),
  },
}))

vi.mock('@/repositories/business.repo', () => ({
  BusinessRepo: {
    findIdBySlug: vi.fn(),
  },
}))

import { LocationRepo } from '@/repositories/location.repo'
import { BusinessRepo } from '@/repositories/business.repo'

const mockLocationRepo = vi.mocked(LocationRepo)
const mockBusinessRepo = vi.mocked(BusinessRepo)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LocationService.list', () => {
  it('returns empty when the business is not found', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue(null)
    expect(await LocationService.list('ghost')).toEqual([])
  })

  it('maps location rows to the domain type', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue('biz-1')
    mockLocationRepo.listByBusinessId.mockResolvedValue([
      {
        id: 'loc-1',
        business_id: 'biz-1',
        name: 'Thonglor',
        address: '12 Soi 4',
        opening_hours: { mon: '10:00-19:00' },
        contact_phone: '+66 1',
        contact_whatsapp: null,
        contact_line: null,
        photos: ['https://x/a.jpg'],
        is_primary: true,
        is_active: true,
        sort_order: 0,
      },
    ])

    const result = await LocationService.list('glowstudio')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'loc-1',
      businessId: 'biz-1',
      name: 'Thonglor',
      address: '12 Soi 4',
      openingHours: { mon: '10:00-19:00' },
      contactPhone: '+66 1',
      contactWhatsapp: null,
      contactLine: null,
      photos: ['https://x/a.jpg'],
      isPrimary: true,
      isActive: true,
      sortOrder: 0,
    })
  })
})

describe('LocationService.create', () => {
  it('makes the first location primary', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue('biz-1')
    mockLocationRepo.countActiveByBusinessId.mockResolvedValue(0)
    mockLocationRepo.insert.mockResolvedValue({
      id: 'loc-1', business_id: 'biz-1', name: null, address: 'Main St',
      is_primary: true, is_active: true, sort_order: 0, photos: [],
    })

    await LocationService.create('glowstudio', { address: 'Main St' })

    expect(mockLocationRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: 'biz-1', address: 'Main St', is_primary: true, sort_order: 0 }),
    )
  })

  it('makes subsequent locations secondary branches', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue('biz-1')
    mockLocationRepo.countActiveByBusinessId.mockResolvedValue(2)
    mockLocationRepo.insert.mockResolvedValue({
      id: 'loc-3', business_id: 'biz-1', name: 'Branch', address: 'Second St',
      is_primary: false, is_active: true, sort_order: 2, photos: [],
    })

    await LocationService.create('glowstudio', { name: 'Branch', address: 'Second St' })

    expect(mockLocationRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_primary: false, sort_order: 2, name: 'Branch' }),
    )
  })

  it('throws when the business is not found', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue(null)
    await expect(LocationService.create('ghost', { address: 'X' })).rejects.toThrow('Business not found')
  })
})

describe('LocationService.remove', () => {
  it('refuses to remove the primary location', async () => {
    mockLocationRepo.findById.mockResolvedValue({ id: 'loc-1', is_primary: true })
    await expect(LocationService.remove('loc-1')).rejects.toThrow(/primary location/i)
    expect(mockLocationRepo.deactivate).not.toHaveBeenCalled()
  })

  it('soft-deletes a secondary branch', async () => {
    mockLocationRepo.findById.mockResolvedValue({ id: 'loc-2', is_primary: false })
    await LocationService.remove('loc-2')
    expect(mockLocationRepo.deactivate).toHaveBeenCalledWith('loc-2')
  })
})
