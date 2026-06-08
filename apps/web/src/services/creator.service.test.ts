import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
}))

import { CreatorService } from './creator.service'
import { createServerClient } from '@/lib/supabase'

const mockCreateServerClient = vi.mocked(createServerClient)

beforeEach(() => {
  vi.clearAllMocks()
})

type Row = Record<string, unknown> | null

/** Minimal chainable Supabase stub — see business.service.test.ts. */
function fakeDb(opts: {
  rows?: Record<string, (filters: Record<string, unknown>) => Row>
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
      }
      return builder
    },
  }
}

describe('CreatorService.create — identity exclusivity', () => {
  const input = {
    slug: 'glowwithsara',
    handle: '@glowwithsara',
    displayName: 'Sara',
    bio: '',
  }

  it('rejects an email that already belongs to a business', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateServerClient.mockReturnValue(fakeDb({
      rows: { businesses: (f) => (f.email === 'shop@example.com' ? { id: 'b1' } : null) },
    }) as any)
    await expect(CreatorService.create({ ...input, email: 'shop@example.com' }))
      .rejects.toThrow(/already belongs to a business/)
  })

  it('rejects an auth user who already owns a business', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateServerClient.mockReturnValue(fakeDb({
      rows: { businesses: (f) => (f.auth_user_id === 'u1' ? { id: 'b1' } : null) },
    }) as any)
    await expect(CreatorService.create({ ...input, authUserId: 'u1' }))
      .rejects.toThrow(/business account/i)
  })

  it('creates the creator when no business owns the account or email', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateServerClient.mockReturnValue(fakeDb({
      inserted: { creators: { slug: 'glowwithsara', id: 'c1' } },
    }) as any)
    await expect(CreatorService.create({ ...input, email: 'sara@example.com', authUserId: 'u2' }))
      .resolves.toEqual({ slug: 'glowwithsara', id: 'c1' })
  })
})
