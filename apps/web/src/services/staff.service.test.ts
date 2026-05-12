import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StaffService } from './staff.service'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createServerClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { duration: 60, buffer_minutes: 0 } }),
  })),
}))

vi.mock('@/repositories/staff.repo', () => ({
  StaffRepo: {
    listByBusinessId: vi.fn(),
    findById: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    listServiceIds: vi.fn(),
    replaceServiceIds: vi.fn(),
    insertServiceIds: vi.fn(),
    getSchedule: vi.fn(),
    replaceSchedule: vi.fn(),
    listBlocks: vi.fn(),
    insertBlock: vi.fn(),
    deleteBlock: vi.fn(),
    findBusinessIdByStaffId: vi.fn(),
    listActiveByBusinessId: vi.fn(),
    listEligibleForService: vi.fn(),
    listBookingsForStaffOnDate: vi.fn(),
    listSchedulesForStaffOnDow: vi.fn(),
    listBlocksForStaff: vi.fn(),
  },
}))

vi.mock('@/repositories/business.repo', () => ({
  BusinessRepo: {
    findIdBySlug: vi.fn(),
  },
}))

import { StaffRepo } from '@/repositories/staff.repo'
import { BusinessRepo } from '@/repositories/business.repo'

const mockStaffRepo = vi.mocked(StaffRepo)
const mockBusinessRepo = vi.mocked(BusinessRepo)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StaffService.list', () => {
  it('returns empty array when business not found', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue(null)
    const result = await StaffService.list('nonexistent')
    expect(result).toEqual([])
  })

  it('returns mapped staff with service IDs', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue('biz-1')
    mockStaffRepo.listByBusinessId.mockResolvedValue([
      { id: 'staff-1', business_id: 'biz-1', name: 'Alice', role: 'Therapist', photo_url: null, is_active: true },
      { id: 'staff-2', business_id: 'biz-1', name: 'Bob', role: null, photo_url: 'https://example.com/bob.jpg', is_active: true },
    ])
    mockStaffRepo.listServiceIds.mockResolvedValue(
      new Map([
        ['staff-1', ['svc-1', 'svc-2']],
        ['staff-2', ['svc-1']],
      ]),
    )

    const result = await StaffService.list('test-business')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'staff-1',
      businessId: 'biz-1',
      name: 'Alice',
      role: 'Therapist',
      photoUrl: null,
      isActive: true,
      serviceIds: ['svc-1', 'svc-2'],
    })
    expect(result[1].name).toBe('Bob')
    expect(result[1].serviceIds).toEqual(['svc-1'])
  })
})

describe('StaffService.create', () => {
  it('creates staff and inserts service IDs', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue('biz-1')
    mockStaffRepo.insert.mockResolvedValue({
      id: 'staff-new',
      business_id: 'biz-1',
      name: 'Charlie',
      role: 'Senior',
      photo_url: null,
      is_active: true,
    })

    const result = await StaffService.create('test-biz', {
      name: 'Charlie',
      role: 'Senior',
      serviceIds: ['svc-1', 'svc-2'],
    })

    expect(result.id).toBe('staff-new')
    expect(result.name).toBe('Charlie')
    expect(result.serviceIds).toEqual(['svc-1', 'svc-2'])
    expect(mockStaffRepo.insert).toHaveBeenCalledWith({
      business_id: 'biz-1',
      name: 'Charlie',
      role: 'Senior',
      photo_url: null,
    })
    expect(mockStaffRepo.insertServiceIds).toHaveBeenCalledWith('staff-new', ['svc-1', 'svc-2'])
  })

  it('throws when business not found', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue(null)
    await expect(
      StaffService.create('ghost', { name: 'X', serviceIds: [] }),
    ).rejects.toThrow('Business not found')
  })

  it('skips service ID insert when array is empty', async () => {
    mockBusinessRepo.findIdBySlug.mockResolvedValue('biz-1')
    mockStaffRepo.insert.mockResolvedValue({
      id: 'staff-new',
      business_id: 'biz-1',
      name: 'Dana',
      role: null,
      photo_url: null,
      is_active: true,
    })

    await StaffService.create('test-biz', { name: 'Dana', serviceIds: [] })
    expect(mockStaffRepo.insertServiceIds).not.toHaveBeenCalled()
  })
})

describe('StaffService.update', () => {
  it('updates name and role fields', async () => {
    await StaffService.update('staff-1', { name: 'Updated', role: 'Lead' })

    expect(mockStaffRepo.update).toHaveBeenCalledWith('staff-1', {
      name: 'Updated',
      role: 'Lead',
    })
  })

  it('replaces service IDs when provided', async () => {
    await StaffService.update('staff-1', { serviceIds: ['svc-3'] })

    expect(mockStaffRepo.replaceServiceIds).toHaveBeenCalledWith('staff-1', ['svc-3'])
  })

  it('nullifies empty role', async () => {
    await StaffService.update('staff-1', { role: '' })
    expect(mockStaffRepo.update).toHaveBeenCalledWith('staff-1', { role: null })
  })
})

describe('StaffService.deactivate', () => {
  it('delegates to repo', async () => {
    await StaffService.deactivate('staff-1')
    expect(mockStaffRepo.deactivate).toHaveBeenCalledWith('staff-1')
  })
})

describe('StaffService.getSchedule', () => {
  it('maps repo rows to typed entries', async () => {
    mockStaffRepo.getSchedule.mockResolvedValue([
      { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_available: true },
    ])

    const result = await StaffService.getSchedule('staff-1')
    expect(result).toEqual([
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
    ])
  })
})

describe('StaffService.setSchedule', () => {
  it('maps domain entries to repo rows', async () => {
    await StaffService.setSchedule('staff-1', [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
    ])

    expect(mockStaffRepo.replaceSchedule).toHaveBeenCalledWith('staff-1', [
      { staff_id: 'staff-1', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
    ])
  })
})

describe('StaffService.createBlock', () => {
  it('creates a block with default times', async () => {
    mockStaffRepo.findBusinessIdByStaffId.mockResolvedValue('biz-1')
    mockStaffRepo.insertBlock.mockResolvedValue({
      id: 'block-1',
      staff_id: 'staff-1',
      block_date: '2026-05-20',
      start_time: '00:00:00',
      end_time: '23:59:00',
      reason: null,
    })

    const result = await StaffService.createBlock('staff-1', { blockDate: '2026-05-20' })

    expect(result.id).toBe('block-1')
    expect(result.blockDate).toBe('2026-05-20')
    expect(result.startTime).toBe('00:00')
    expect(result.endTime).toBe('23:59')
    expect(result.reason).toBeNull()
  })

  it('throws when staff not found', async () => {
    mockStaffRepo.findBusinessIdByStaffId.mockResolvedValue(null)
    await expect(
      StaffService.createBlock('ghost', { blockDate: '2026-05-20' }),
    ).rejects.toThrow('Staff not found')
  })
})
