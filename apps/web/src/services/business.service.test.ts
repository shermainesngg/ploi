import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
}))

vi.mock('@/repositories/business.repo', () => ({
  BusinessRepo: {
    updateBySlug: vi.fn(),
    findIdBySlug: vi.fn(),
  },
}))

vi.mock('@/repositories/location.repo', () => ({
  LocationRepo: {
    updatePrimaryByBusinessId: vi.fn(),
  },
}))

vi.mock('@/services/content.service', () => ({
  ContentService: {},
}))

import { BusinessService } from './business.service'
import { BusinessRepo } from '@/repositories/business.repo'
import { LocationRepo } from '@/repositories/location.repo'
import { createServerClient } from '@/lib/supabase'

const mockRepo = vi.mocked(BusinessRepo)
const mockLocationRepo = vi.mocked(LocationRepo)
const mockCreateServerClient = vi.mocked(createServerClient)

beforeEach(() => {
  vi.clearAllMocks()
  // updateSettings mirrors the primary location after the row update.
  mockRepo.findIdBySlug.mockResolvedValue('biz-1')
})

type Row = Record<string, unknown> | null

/**
 * Minimal chainable Supabase stub. `rows` resolves maybeSingle() per table
 * from the accumulated eq() filters; `counts` answers head-count queries;
 * `inserted` is what insert().select().single() returns per table.
 */
function fakeDb(opts: {
  rows?: Record<string, (filters: Record<string, unknown>) => Row>
  counts?: Record<string, number>
  inserted?: Record<string, Row>
}) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: () => builder,
        eq: (k: string, v: unknown) => { filters[k] = v; return builder },
        maybeSingle: async () => ({ data: opts.rows?.[table]?.(filters) ?? null }),
        single: async () => ({ data: opts.inserted?.[table] ?? null, error: null }),
        then: (resolve: (v: unknown) => void) =>
          resolve({ count: opts.counts?.[table] ?? 0, data: [], error: null }),
      }
      return builder
    },
  }
}

describe('BusinessService.create — identity exclusivity', () => {
  const input = {
    slug: 'glow-studio',
    name: 'Glow Studio',
    category: 'Beauty & Wellness',
    location: 'Bangkok',
    description: 'Glow.',
    services: [{ name: 'Facial', description: '', duration: 60, price: 1000 }],
  }

  it('rejects an email that already belongs to a creator', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateServerClient.mockReturnValue(fakeDb({
      rows: { creators: (f) => (f.email === 'sara@example.com' ? { id: 'c1' } : null) },
    }) as any)
    await expect(BusinessService.create({ ...input, email: 'sara@example.com' }))
      .rejects.toThrow(/already belongs to a creator/)
  })

  it('rejects an auth user who is already a creator', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateServerClient.mockReturnValue(fakeDb({
      rows: { creators: (f) => (f.auth_user_id === 'u1' ? { id: 'c1' } : null) },
    }) as any)
    await expect(BusinessService.create({ ...input, authUserId: 'u1' }))
      .rejects.toThrow(/already a creator/)
  })

  it('rejects a customer email with booking history', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateServerClient.mockReturnValue(fakeDb({
      rows: { consumers: (f) => (f.email === 'ploy@example.com' ? { id: 'con1' } : null) },
      counts: { bookings: 3 },
    }) as any)
    await expect(BusinessService.create({ ...input, email: 'ploy@example.com' }))
      .rejects.toThrow(/customer account/)
  })

  it('allows an empty auto-minted consumer row (normal signup flow)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateServerClient.mockReturnValue(fakeDb({
      rows: { consumers: (f) => (f.auth_user_id === 'u1' ? { id: 'con1' } : null) },
      counts: { bookings: 0 },
      inserted: { businesses: { slug: 'glow-studio', id: 'b1' } },
    }) as any)
    await expect(BusinessService.create({ ...input, authUserId: 'u1', email: 'new@example.com' }))
      .resolves.toEqual({ slug: 'glow-studio', id: 'b1' })
  })
})

describe('BusinessService.updateSettings', () => {
  const baseInput = {
    name: 'Glow Studio',
    category: 'Beauty & Wellness',
    location: 'Sukhumvit, Bangkok',
    description: 'Premier glow destination.',
    contactPhone: '+66 2 123 4567',
    contactWhatsapp: '',
    contactLine: '@glow',
    photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    openingHours: { mon: '10:00-20:00', sun: 'closed' },
  }

  it('maps fields to snake_case and derives the cover from the first photo', async () => {
    await BusinessService.updateSettings('glowstudio', baseInput)
    expect(mockRepo.updateBySlug).toHaveBeenCalledWith('glowstudio', {
      name: 'Glow Studio',
      category: 'Beauty & Wellness',
      location: 'Sukhumvit, Bangkok',
      description: 'Premier glow destination.',
      cover_photo_url: 'https://example.com/a.jpg',
      photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      opening_hours: { mon: '10:00-20:00', sun: 'closed' },
      contact_phone: '+66 2 123 4567',
      contact_whatsapp: null,
      contact_line: '@glow',
    })
    // The primary location is mirrored from the same headline fields.
    expect(mockLocationRepo.updatePrimaryByBusinessId).toHaveBeenCalledWith('biz-1', {
      address: 'Sukhumvit, Bangkok',
      opening_hours: { mon: '10:00-20:00', sun: 'closed' },
      contact_phone: '+66 2 123 4567',
      contact_whatsapp: null,
      contact_line: '@glow',
    })
  })

  it('drops blank photo entries and nulls the cover when none remain', async () => {
    await BusinessService.updateSettings('glowstudio', { ...baseInput, photos: ['', '  '] })
    const updates = mockRepo.updateBySlug.mock.calls[0][1]
    expect(updates.photos).toEqual([])
    expect(updates.cover_photo_url).toBeNull()
  })

  it('normalizes empty contact strings to null', async () => {
    await BusinessService.updateSettings('glowstudio', {
      ...baseInput,
      contactPhone: '  ',
      contactWhatsapp: undefined,
    })
    const updates = mockRepo.updateBySlug.mock.calls[0][1]
    expect(updates.contact_phone).toBeNull()
    expect(updates.contact_whatsapp).toBeNull()
  })
})
