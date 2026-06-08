import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { BusinessRepo } from '@/repositories/business.repo'
import { LocationRepo } from '@/repositories/location.repo'
import {
  businesses as seedBusinesses,
  creators as seedCreators,
  links as seedLinks,
} from '@/lib/seed-data'
import { rowToBusiness, rowToCreator, rowToLink } from '@/lib/mappers'
import { ContentService } from '@/services/content.service'
import type { Business, BusinessCreatorAffiliation, ContentWithCreator } from '@/lib/types'

export const BusinessService = {
  async list(): Promise<Business[]> {
    if (!isSupabaseConfigured()) {
      return Object.values(seedBusinesses)
    }
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('*, services(*), locations(*)')
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
      .select('*, services(*), locations(*)')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
      .limit(10)
    return (data ?? []).map(rowToBusiness)
  },

  // Direct (non-creator) lookup for organic discovery — no attribution.
  async getBySlug(businessSlug: string): Promise<Business | null> {
    if (!isSupabaseConfigured()) {
      return seedBusinesses[businessSlug] ?? null
    }
    const db = createServerClient()
    const { data: bizRow } = await db
      .from('businesses')
      .select('*, services(*), locations(*)')
      .eq('slug', businessSlug)
      .eq('is_active', true)
      .single()
    return bizRow ? rowToBusiness(bizRow) : null
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
        .select('*, services(*), locations(*)')
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
    authUserId?: string
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

    // Slugs are shared across the /[slug] namespace — a business can't claim a
    // slug already taken by a creator.
    const { data: creatorClash } = await db
      .from('creators')
      .select('id')
      .eq('slug', data.slug)
      .maybeSingle()
    if (creatorClash) {
      throw new Error('That name is already taken by a creator on PLOI. Please choose a different name.')
    }

    // Business identities are exclusive — an account or email already used as
    // a creator (or as a customer with booking history) can't sign up a
    // business. An EMPTY consumer row doesn't count: one is auto-minted for any
    // signed-in visitor (including mid business-signup), and the businesses API
    // route deletes it again after creation.
    async function consumerHasBookings(consumerId: string): Promise<boolean> {
      const { count } = await db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('consumer_id', consumerId)
      return (count ?? 0) > 0
    }
    if (data.authUserId) {
      const { data: creByUser } = await db
        .from('creators')
        .select('id')
        .eq('auth_user_id', data.authUserId)
        .maybeSingle()
      if (creByUser) {
        throw new Error('This account is already a creator on PLOI. Use a separate account for your business.')
      }
      const { data: conByUser } = await db
        .from('consumers')
        .select('id')
        .eq('auth_user_id', data.authUserId)
        .maybeSingle()
      if (conByUser && (await consumerHasBookings(conByUser.id))) {
        throw new Error('This account is already a customer on PLOI. Use a separate account for your business.')
      }
    }
    if (data.email) {
      const { data: creByEmail } = await db
        .from('creators')
        .select('id')
        .eq('email', data.email)
        .maybeSingle()
      if (creByEmail) {
        throw new Error('That email already belongs to a creator on PLOI. Use a separate email for your business.')
      }
      const { data: conByEmail } = await db
        .from('consumers')
        .select('id')
        .eq('email', data.email)
        .maybeSingle()
      if (conByEmail && (await consumerHasBookings(conByEmail.id))) {
        throw new Error('That email already belongs to a customer account on PLOI. Use a separate email for your business.')
      }
    }

    const { data: biz, error: bizErr } = await db
      .from('businesses')
      .insert({
        slug: data.slug,
        name: data.name,
        category: data.category,
        location: data.location,
        description: data.description,
        email: data.email ?? null,
        auth_user_id: data.authUserId ?? null,
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

    // Every business starts with one primary location, mirrored from the
    // headline fields above. Secondary branches are added from the dashboard.
    const { error: locErr } = await db.from('locations').insert({
      business_id: biz.id,
      name: null,
      address: data.location,
      opening_hours: data.openingHours ?? null,
      contact_phone: data.contactPhone ?? null,
      contact_whatsapp: data.contactWhatsapp ?? null,
      contact_line: data.contactLine ?? null,
      is_primary: true,
      sort_order: 0,
    })
    if (locErr) throw new Error(locErr.message)

    return { slug: biz.slug, id: biz.id }
  },

  /**
   * Update the editable profile fields from the dashboard Settings tab.
   * Slug, email, auth linkage, Stripe, and services are not touched here.
   * The cover photo follows the first gallery photo (same rule as create).
   */
  async updateSettings(slug: string, data: {
    name: string
    category: string
    location: string
    description: string
    contactPhone?: string
    contactWhatsapp?: string
    contactLine?: string
    photos: string[]
    openingHours?: Record<string, string>
  }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add env vars to .env.local to save data.')
    }

    const photos = data.photos.filter((p) => p.trim().length > 0)

    await BusinessRepo.updateBySlug(slug, {
      name: data.name,
      category: data.category,
      location: data.location,
      description: data.description,
      cover_photo_url: photos[0] ?? null,
      photos,
      opening_hours: data.openingHours ?? null,
      contact_phone: data.contactPhone?.trim() || null,
      contact_whatsapp: data.contactWhatsapp?.trim() || null,
      contact_line: data.contactLine?.trim() || null,
    })

    // Keep the primary location in sync with the headline fields. Secondary
    // branches manage their own address/hours/contacts independently.
    const businessId = await BusinessRepo.findIdBySlug(slug)
    if (businessId) {
      await LocationRepo.updatePrimaryByBusinessId(businessId, {
        address: data.location,
        opening_hours: data.openingHours ?? null,
        contact_phone: data.contactPhone?.trim() || null,
        contact_whatsapp: data.contactWhatsapp?.trim() || null,
        contact_line: data.contactLine?.trim() || null,
      })
    }
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

  async getContent(businessSlug: string): Promise<ContentWithCreator[]> {
    if (!isSupabaseConfigured()) return []
    const db = createServerClient()
    const { data: bizRow } = await db
      .from('businesses')
      .select('id')
      .eq('slug', businessSlug)
      .single()
    if (!bizRow) return []
    return ContentService.listForBusiness(bizRow.id)
  },

  async getPendingContent(businessSlug: string): Promise<ContentWithCreator[]> {
    if (!isSupabaseConfigured()) return []
    const db = createServerClient()
    const { data: bizRow } = await db
      .from('businesses')
      .select('id')
      .eq('slug', businessSlug)
      .single()
    if (!bizRow) return []
    return ContentService.listPendingForBusiness(bizRow.id)
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
