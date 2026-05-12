import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  businesses as seedBusinesses,
  creators as seedCreators,
  links as seedLinks,
} from '@/lib/seed-data'
import { rowToBusiness, rowToCreator, rowToLink } from '@/lib/mappers'
import type { Business, BusinessCreatorAffiliation } from '@/lib/types'

export const BusinessService = {
  async list(): Promise<Business[]> {
    if (!isSupabaseConfigured()) {
      return Object.values(seedBusinesses)
    }
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('*, services(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    return (data ?? []).map(rowToBusiness)
  },

  async search(query: string): Promise<Business[]> {
    if (!isSupabaseConfigured()) {
      const q = query.toLowerCase()
      return Object.values(seedBusinesses).filter(
        (b) => b.name.toLowerCase().includes(q) || b.slug.includes(q),
      )
    }
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('*, services(*)')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
      .limit(10)
    return (data ?? []).map(rowToBusiness)
  },

  async getPageData(creatorSlug: string, businessSlug: string) {
    if (!isSupabaseConfigured()) {
      const business = seedBusinesses[businessSlug] ?? null
      const creator = seedCreators[creatorSlug] ?? null
      const link =
        seedLinks.find(
          (l) => l.creatorSlug === creatorSlug && l.businessSlug === businessSlug,
        ) ?? null
      return { business, creator, link }
    }

    const db = createServerClient()

    const [{ data: bizRow }, { data: creatorRow }] = await Promise.all([
      db
        .from('businesses')
        .select('*, services(*)')
        .eq('slug', businessSlug)
        .eq('is_active', true)
        .single(),
      db
        .from('creators')
        .select('*')
        .eq('slug', creatorSlug)
        .eq('is_active', true)
        .single(),
    ])

    if (!bizRow) return { business: null, creator: null, link: null }

    const { data: linkRow } = creatorRow
      ? await db
          .from('links')
          .select('*')
          .eq('creator_id', creatorRow.id)
          .eq('business_id', bizRow.id)
          .single()
      : { data: null }

    const business = rowToBusiness(bizRow)
    const creator = creatorRow
      ? rowToCreator(creatorRow, [businessSlug])
      : null
    const link = linkRow ? rowToLink(linkRow, creatorSlug, businessSlug) : null

    return { business, creator, link }
  },

  async create(data: {
    slug: string
    name: string
    category: string
    location: string
    description: string
    email?: string
    coverPhotoUrl?: string
    photos?: string[]
    openingHours?: Record<string, string>
    contactPhone?: string
    contactWhatsapp?: string
    contactLine?: string
    services: Array<{ name: string; description: string; duration: number; price: number }>
  }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add env vars to .env.local to save data.')
    }

    if (!data.services || data.services.length === 0) {
      throw new Error('A business must have at least one service.')
    }

    const photos = data.photos?.filter((p) => p.trim().length > 0) ?? []
    const coverPhoto = data.coverPhotoUrl ?? photos[0] ?? null

    const db = createServerClient()

    const { data: biz, error: bizErr } = await db
      .from('businesses')
      .insert({
        slug: data.slug,
        name: data.name,
        category: data.category,
        location: data.location,
        description: data.description,
        email: data.email ?? null,
        cover_photo_url: coverPhoto,
        photos,
        opening_hours: data.openingHours ?? null,
        contact_phone: data.contactPhone ?? null,
        contact_whatsapp: data.contactWhatsapp ?? null,
        contact_line: data.contactLine ?? null,
      })
      .select()
      .single()

    if (bizErr) throw new Error(bizErr.message)

    const serviceRows = data.services.map((s, i) => ({
      business_id: biz.id,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      sort_order: i + 1,
    }))

    const { error: svcErr } = await db.from('services').insert(serviceRows)
    if (svcErr) throw new Error(svcErr.message)

    return { slug: biz.slug, id: biz.id }
  },

  async getStripeStatus(businessSlug: string) {
    if (!isSupabaseConfigured()) return { hasAccount: false, accountId: null }
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('stripe_account_id')
      .eq('slug', businessSlug)
      .single()
    return {
      hasAccount: !!data?.stripe_account_id,
      accountId: data?.stripe_account_id ?? null,
    }
  },

  async getAffiliations(businessSlug: string): Promise<BusinessCreatorAffiliation[]> {
    if (!isSupabaseConfigured()) {
      const matches = seedLinks.filter(
        (l) => l.businessSlug === businessSlug && l.status === 'active',
      )
      return matches
        .map((l) => {
          const creator = seedCreators[l.creatorSlug]
          if (!creator) return null
          return {
            creator,
            link: l,
            totalPlacesRecommended: creator.linkedBusinessSlugs.length,
            bookingsDriven: 0,
          }
        })
        .filter(Boolean) as BusinessCreatorAffiliation[]
    }

    const db = createServerClient()
    const { data: bizRow } = await db
      .from('businesses')
      .select('id')
      .eq('slug', businessSlug)
      .single()
    if (!bizRow) return []

    const { data: linkRows } = await db
      .from('links')
      .select(`
        *,
        creators ( id, slug, handle, display_name, bio, socials )
      `)
      .eq('business_id', bizRow.id)
      .eq('status', 'active')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creatorIds = (linkRows ?? []).map((r: any) => r.creators?.id).filter(Boolean)

    const { data: placesRows } = creatorIds.length
      ? await db.from('links').select('creator_id').in('creator_id', creatorIds).eq('status', 'active')
      : { data: [] }

    const placesByCreator = new Map<string, number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (placesRows ?? []) as any[]) {
      placesByCreator.set(p.creator_id, (placesByCreator.get(p.creator_id) ?? 0) + 1)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkIds = (linkRows ?? []).map((l: any) => l.id)
    const { data: bookingRows } = linkIds.length
      ? await db.from('bookings').select('link_id').in('link_id', linkIds).neq('status', 'cancelled').neq('status', 'declined')
      : { data: [] }

    const bookingsByLink = new Map<string, number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const b of (bookingRows ?? []) as any[]) {
      bookingsByLink.set(b.link_id, (bookingsByLink.get(b.link_id) ?? 0) + 1)
    }

    return (linkRows ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any): BusinessCreatorAffiliation | null => {
        if (!r.creators) return null
        return {
          creator: rowToCreator(r.creators, [businessSlug]),
          link: rowToLink(r, r.creators.slug, businessSlug),
          totalPlacesRecommended: placesByCreator.get(r.creators.id) ?? 1,
          bookingsDriven: bookingsByLink.get(r.id) ?? 0,
        }
      })
      .filter(Boolean) as BusinessCreatorAffiliation[]
  },

  async getRecentBookingCount(businessSlug: string): Promise<number> {
    if (!isSupabaseConfigured()) return 23
    const db = createServerClient()
    const { data: bizRow } = await db
      .from('businesses')
      .select('id')
      .eq('slug', businessSlug)
      .single()
    if (!bizRow) return 0

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', bizRow.id)
      .gte('created_at', oneWeekAgo)
      .neq('status', 'cancelled')
      .neq('status', 'declined')

    return count ?? 0
  },
}
