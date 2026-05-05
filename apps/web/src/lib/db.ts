/**
 * Data access layer for BRIDGE.
 *
 * When Supabase env vars are set, reads/writes go to the live database.
 * Otherwise falls back to local seed data so the demo always works.
 */

import { isSupabaseConfigured, createServerClient } from './supabase'
import {
  businesses as seedBusinesses,
  creators as seedCreators,
  links as seedLinks,
} from './seed-data'
import type {
  Business,
  Creator,
  Service,
  Social,
  Link,
  LinkStatus,
  SocialPlatform,
  BookingWithCreator,
  BusinessDashboardData,
  CreatorDashboardData,
  CreatorRollup,
  LinkPerformance,
  ActivityEvent,
} from './types'
import { calculateCreatorEarnings, calculatePlatformFee } from './constants'
import { normalizePhone } from './phone'

// ── Category → gradient ───────────────────────────────────────────────────────

const GRADIENTS: Record<string, [string, string]> = {
  'Beauty & Wellness': ['#f43f5e', '#fb923c'],
  'Hair & Barber': ['#8b5cf6', '#ec4899'],
  'Nail & Spa': ['#ec4899', '#f97316'],
  'Fitness & Yoga': ['#3b82f6', '#06b6d4'],
  'Massage & Therapy': ['#10b981', '#3b82f6'],
  'Tattoo & Piercing': ['#111827', '#374151'],
  'Makeup & Styling': ['#f59e0b', '#ef4444'],
}
const DEFAULT_GRADIENT: [string, string] = ['#6366f1', '#8b5cf6']

export function gradientForCategory(cat: string): [string, string] {
  return GRADIENTS[cat] ?? DEFAULT_GRADIENT
}

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#e11d48', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4']

function avatarFor(displayName: string, handle: string) {
  const initials = displayName
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const color = AVATAR_COLORS[handle.charCodeAt(1) % AVATAR_COLORS.length]
  return { initials, color }
}

// ── Row mappers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToService(r: any): Service {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    duration: r.duration,
    price: r.price,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBusiness(r: any): Business {
  // Sort, map, then dedupe by name — protects against re-seeded duplicate rows
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: Service[] = (r.services ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map(rowToService)

  const seen = new Set<string>()
  const services = all.filter((s) => {
    const key = s.name.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const photos: string[] = Array.isArray(r.photos)
    ? r.photos.filter((p: unknown) => typeof p === 'string')
    : []

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    location: r.location,
    description: r.description ?? '',
    coverGradient: gradientForCategory(r.category),
    coverPhotoUrl: r.cover_photo_url ?? null,
    photos,
    openingHours: r.opening_hours ?? null,
    contactPhone: r.contact_phone ?? null,
    contactWhatsapp: r.contact_whatsapp ?? null,
    contactLine: r.contact_line ?? null,
    rating: Number(r.rating ?? 0),
    reviewCount: r.review_count ?? 0,
    services,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCreator(r: any, linkedBusinessSlugs: string[]): Creator {
  const { initials, color } = avatarFor(r.display_name, r.slug)
  // Socials may come as JSONB array or null
  const rawSocials = r.socials
  const socials: Social[] = Array.isArray(rawSocials)
    ? rawSocials.filter((s: any) => s && s.platform && s.url)
    : []
  return {
    id: r.id,
    slug: r.slug,
    handle: r.handle,
    displayName: r.display_name,
    bio: r.bio ?? '',
    avatarInitials: initials,
    avatarColor: color,
    socials,
    linkedBusinessSlugs,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLink(r: any, creatorSlug: string, businessSlug: string): Link {
  return {
    id: r.id,
    creatorSlug,
    businessSlug,
    shortCode: r.short_code,
    contentUrl: r.content_url ?? null,
    platform: r.platform ?? null,
    contentThumbnailUrl: r.content_thumbnail_url ?? null,
    status: (r.status ?? 'pending') as LinkStatus,
    clickCount: r.click_count ?? 0,
    featuredServiceId: r.featured_service_id ?? null,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getPageData(creatorSlug: string, businessSlug: string) {
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
}

export interface CreatorBusinessLink {
  business: Business
  link: Link
}

export async function getCreatorProfile(creatorSlug: string): Promise<{
  creator: Creator | null
  entries: CreatorBusinessLink[]
}> {
  if (!isSupabaseConfigured()) {
    const creator = seedCreators[creatorSlug] ?? null
    if (!creator) return { creator: null, entries: [] }
    const entries: CreatorBusinessLink[] = creator.linkedBusinessSlugs
      .map((s) => {
        const biz = seedBusinesses[s]
        const link = seedLinks.find(
          (l) => l.creatorSlug === creatorSlug && l.businessSlug === s,
        )
        return biz && link ? { business: biz, link } : null
      })
      .filter(Boolean) as CreatorBusinessLink[]
    return { creator, entries }
  }

  const db = createServerClient()

  const { data: creatorRow } = await db
    .from('creators')
    .select('*')
    .eq('slug', creatorSlug)
    .eq('is_active', true)
    .single()

  if (!creatorRow) return { creator: null, entries: [] }

  // Get all active links this creator has
  const { data: linkRows } = await db
    .from('links')
    .select('*')
    .eq('creator_id', creatorRow.id)
    .eq('status', 'active')

  const businessIds = (linkRows ?? []).map((l: any) => l.business_id)
  const { data: bizRows } = businessIds.length
    ? await db
        .from('businesses')
        .select('*, services(*)')
        .in('id', businessIds)
        .eq('is_active', true)
    : { data: [] }

  const businessById = new Map<string, Business>()
  for (const r of bizRows ?? []) {
    businessById.set(r.id, rowToBusiness(r))
  }

  const entries: CreatorBusinessLink[] = (linkRows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((lr: any) => {
      const biz = businessById.get(lr.business_id)
      if (!biz) return null
      return { business: biz, link: rowToLink(lr, creatorSlug, biz.slug) }
    })
    .filter(Boolean) as CreatorBusinessLink[]

  const creator = rowToCreator(creatorRow, entries.map((e) => e.business.slug))

  return { creator, entries }
}

export async function createBusiness(data: {
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

  // First photo is also the cover if cover not provided separately
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
}

export async function createCreator(data: {
  slug: string
  handle: string
  displayName: string
  bio: string
  email?: string
  socials?: Social[]
}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Add env vars to .env.local to save data.')
  }

  const db = createServerClient()

  const { data: creator, error } = await db
    .from('creators')
    .insert({
      slug: data.slug,
      handle: data.handle,
      display_name: data.displayName,
      bio: data.bio,
      email: data.email ?? null,
      socials: data.socials ?? [],
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return { slug: creator.slug, id: creator.id }
}

export async function createLink(opts: {
  creatorId: string
  businessId: string
  shortCode: string
  contentUrl?: string
  platform?: SocialPlatform
  contentThumbnailUrl?: string
  featuredServiceId?: string | null
}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured.')
  }
  const db = createServerClient()
  const { data, error } = await db
    .from('links')
    .insert({
      creator_id: opts.creatorId,
      business_id: opts.businessId,
      short_code: opts.shortCode,
      content_url: opts.contentUrl ?? null,
      platform: opts.platform ?? null,
      content_thumbnail_url: opts.contentThumbnailUrl ?? null,
      featured_service_id: opts.featuredServiceId ?? null,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateLinkStatus(linkId: string, status: LinkStatus) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured.')
  const db = createServerClient()
  const { error } = await db
    .from('links')
    .update({ status })
    .eq('id', linkId)
  if (error) throw new Error(error.message)
}

export async function recordLinkClick(creatorSlug: string, businessSlug: string) {
  if (!isSupabaseConfigured()) return
  const db = createServerClient()

  // Look up the link by joining
  const { data: linkRow } = await db
    .from('links')
    .select('id, status, click_count')
    .eq('short_code', `${creatorSlug}/${businessSlug}`)
    .single()

  if (!linkRow || linkRow.status !== 'active') return

  await Promise.all([
    db
      .from('links')
      .update({ click_count: (linkRow.click_count ?? 0) + 1 })
      .eq('id', linkRow.id),
    db.from('attribution_events').insert({
      link_id: linkRow.id,
      event_type: 'click',
    }),
  ])
}

export async function searchBusinesses(query: string): Promise<Business[]> {
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
}

export async function updateBookingStatus(bookingId: string, status: 'confirmed' | 'declined') {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured.')
  const db = createServerClient()
  const { error } = await db
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
  if (error) throw new Error(error.message)
}

// ── Pending link requests + my creators (for business dashboard) ─────────────

export interface PendingLinkRequest {
  link: Link
  creator: Creator
}

export async function getPendingLinkRequests(businessSlug: string): Promise<PendingLinkRequest[]> {
  if (!isSupabaseConfigured()) return []  // no demo data for this — fresh state

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
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (linkRows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => {
      if (!r.creators) return null
      return {
        link: rowToLink(r, r.creators.slug, businessSlug),
        creator: rowToCreator(r.creators, [businessSlug]),
      }
    })
    .filter(Boolean) as PendingLinkRequest[]
}

export interface MyCreatorEntry {
  creator: Creator
  link: Link
  bookingCount: number
  revenue: number
}

export async function getMyCreators(businessSlug: string): Promise<MyCreatorEntry[]> {
  if (!isSupabaseConfigured()) {
    // Demo: surface Sara as our only creator
    const sara = seedCreators.glowwithsara
    const link = seedLinks.find((l) => l.businessSlug === businessSlug && l.creatorSlug === 'glowwithsara')
    if (!sara || !link) return []
    return [{ creator: sara, link, bookingCount: 0, revenue: 0 }]
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

  const linkIds = (linkRows ?? []).map((l: any) => l.id)
  const { data: bookingRows } = linkIds.length
    ? await db
        .from('bookings')
        .select('link_id, services(price)')
        .in('link_id', linkIds)
        .neq('status', 'cancelled')
        .neq('status', 'declined')
    : { data: [] }

  const bookingsByLink = new Map<string, { count: number; revenue: number }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const b of (bookingRows ?? []) as any[]) {
    const cur = bookingsByLink.get(b.link_id) ?? { count: 0, revenue: 0 }
    cur.count += 1
    // services may come back as object or array depending on relationship cardinality
    const svc = Array.isArray(b.services) ? b.services[0] : b.services
    cur.revenue += svc?.price ?? 0
    bookingsByLink.set(b.link_id, cur)
  }

  return (linkRows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => {
      if (!r.creators) return null
      const stats = bookingsByLink.get(r.id) ?? { count: 0, revenue: 0 }
      return {
        creator: rowToCreator(r.creators, [businessSlug]),
        link: rowToLink(r, r.creators.slug, businessSlug),
        bookingCount: stats.count,
        revenue: stats.revenue,
      }
    })
    .filter(Boolean) as MyCreatorEntry[]
}

// ── Public consumer queries ──────────────────────────────────────────────────

import type { BusinessCreatorAffiliation } from './types'

export async function getBusinessAffiliations(
  businessSlug: string,
): Promise<BusinessCreatorAffiliation[]> {
  if (!isSupabaseConfigured()) {
    // Use seed creators that link to this business
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

  const creatorIds = (linkRows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => r.creators?.id)
    .filter(Boolean)

  // Total places per creator (active links count)
  const { data: placesRows } = creatorIds.length
    ? await db
        .from('links')
        .select('creator_id')
        .in('creator_id', creatorIds)
        .eq('status', 'active')
    : { data: [] }

  const placesByCreator = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (placesRows ?? []) as any[]) {
    placesByCreator.set(p.creator_id, (placesByCreator.get(p.creator_id) ?? 0) + 1)
  }

  // Bookings driven per link
  const linkIds = (linkRows ?? []).map((l: any) => l.id)
  const { data: bookingRows } = linkIds.length
    ? await db
        .from('bookings')
        .select('link_id')
        .in('link_id', linkIds)
        .neq('status', 'cancelled')
        .neq('status', 'declined')
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
}

export async function getRecentBookingCount(businessSlug: string): Promise<number> {
  if (!isSupabaseConfigured()) return 23  // demo placeholder

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
}

// ── Repeat-attribution / customer acquisitions ──────────────────────────────

export interface ActiveAcquisition {
  id: string
  creatorId: string
  linkId: string | null
  customerPhone: string
  acquiredAt: string
  expiresAt: string
}

/**
 * Find an active, non-expired acquisition for this phone+business.
 * Side-effect: marks any expired-but-still-active row inactive.
 */
export async function findActiveAcquisition(
  customerPhone: string,
  businessId: string,
): Promise<ActiveAcquisition | null> {
  if (!isSupabaseConfigured()) return null
  const phone = normalizePhone(customerPhone)
  if (!phone) return null

  const db = createServerClient()
  const { data: row } = await db
    .from('customer_acquisitions')
    .select('id, creator_id, link_id, customer_phone, acquired_at, expires_at, is_active')
    .eq('customer_phone', phone)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .maybeSingle()
  if (!row) return null

  const now = new Date()
  if (new Date(row.expires_at) < now) {
    // Window expired — mark inactive
    await db.from('customer_acquisitions').update({ is_active: false }).eq('id', row.id)
    return null
  }

  return {
    id: row.id,
    creatorId: row.creator_id,
    linkId: row.link_id,
    customerPhone: row.customer_phone,
    acquiredAt: row.acquired_at,
    expiresAt: row.expires_at,
  }
}

/**
 * Run attribution for a new booking. Returns:
 *   - attribution to apply (acquisition_id, link_id override, is_repeat, commission_rate)
 *   - whether this is a new acquisition (caller should create it after the booking is inserted)
 */
export async function resolveAttribution(opts: {
  customerPhone: string | null
  businessId: string
  linkId: string | null
}): Promise<{
  acquisitionId: string | null
  effectiveLinkId: string | null
  isRepeat: boolean
  commissionRate: number | null
  shouldCreateAcquisition: boolean
}> {
  // No phone → no attribution
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

  // Existing active acquisition → repeat
  const existing = await findActiveAcquisition(phone, opts.businessId)
  if (existing) {
    return {
      acquisitionId: existing.id,
      effectiveLinkId: existing.linkId,  // original creator wins
      isRepeat: true,
      commissionRate: 0.05,
      shouldCreateAcquisition: false,
    }
  }

  // First booking via a creator link → create acquisition (after insert)
  if (opts.linkId) {
    return {
      acquisitionId: null,  // will be set after creation
      effectiveLinkId: opts.linkId,
      isRepeat: false,
      commissionRate: 0.10,
      shouldCreateAcquisition: true,
    }
  }

  // No link, no existing → unattributed
  return {
    acquisitionId: null,
    effectiveLinkId: null,
    isRepeat: false,
    commissionRate: null,
    shouldCreateAcquisition: false,
  }
}

export async function createAcquisition(opts: {
  customerPhone: string
  customerEmail?: string | null
  customerName: string
  businessId: string
  creatorId: string
  linkId: string
  firstBookingId: string
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const phone = normalizePhone(opts.customerPhone)
  if (!phone) return null

  const db = createServerClient()
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 6)

  const { data, error } = await db
    .from('customer_acquisitions')
    .insert({
      customer_phone: phone,
      customer_email: opts.customerEmail ?? null,
      customer_name: opts.customerName,
      business_id: opts.businessId,
      creator_id: opts.creatorId,
      link_id: opts.linkId,
      first_booking_id: opts.firstBookingId,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()
  if (error) {
    // Race or duplicate (unique constraint on phone+business). Re-look-up the existing.
    const { data: existing } = await db
      .from('customer_acquisitions')
      .select('id')
      .eq('customer_phone', phone)
      .eq('business_id', opts.businessId)
      .maybeSingle()
    return existing?.id ?? null
  }
  // Backfill the first booking with the new acquisition id
  await db.from('bookings').update({ acquisition_id: data.id }).eq('id', opts.firstBookingId)
  return data.id
}

export async function createBooking(data: {
  serviceId: string
  businessId: string
  linkId?: string
  customerName: string
  customerContact: string
  customerEmail?: string
  customerPhone?: string
  bookingDate: string
  bookingTime: string
}) {
  if (!isSupabaseConfigured()) {
    return { id: `demo_${Date.now()}`, status: 'pending' }
  }

  const db = createServerClient()

  // Resolve attribution before insert
  const attribution = await resolveAttribution({
    customerPhone: data.customerPhone ?? data.customerContact ?? null,
    businessId: data.businessId,
    linkId: data.linkId ?? null,
  })

  // Look up creator id if we have an effectiveLinkId
  let creatorId: string | null = null
  if (attribution.effectiveLinkId) {
    const { data: link } = await db
      .from('links')
      .select('creator_id')
      .eq('id', attribution.effectiveLinkId)
      .maybeSingle()
    creatorId = link?.creator_id ?? null
  }

  const { data: booking, error } = await db
    .from('bookings')
    .insert({
      service_id: data.serviceId,
      business_id: data.businessId,
      link_id: attribution.effectiveLinkId,
      customer_name: data.customerName,
      customer_contact: data.customerContact,
      customer_email: data.customerEmail ?? null,
      customer_phone: data.customerPhone ?? null,
      booking_date: data.bookingDate,
      booking_time: data.bookingTime,
      acquisition_id: attribution.acquisitionId,
      is_repeat: attribution.isRepeat,
      commission_rate: attribution.commissionRate,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // First booking via creator link → create acquisition record
  if (attribution.shouldCreateAcquisition && data.linkId && creatorId && data.customerPhone) {
    await createAcquisition({
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail ?? null,
      customerName: data.customerName,
      businessId: data.businessId,
      creatorId,
      linkId: data.linkId,
      firstBookingId: booking.id,
    })
  }

  // Record attribution event for any link-attributed booking
  if (attribution.effectiveLinkId) {
    await db.from('attribution_events').insert({
      link_id: attribution.effectiveLinkId,
      booking_id: booking.id,
      event_type: 'booking_confirmed',
    })
  }

  return { id: booking.id, status: booking.status }
}

// ── Dashboard data ────────────────────────────────────────────────────────────

function generateMockBookings(business: Business): BookingWithCreator[] {
  const customers = [
    'Lia P.', 'May K.', 'Nicha T.', 'Pim S.', 'Aom J.',
    'Bee R.', 'Tan C.', 'Mint L.', 'Ploy W.', 'Fern S.',
    'Ying H.', 'Nan B.',
  ]
  const times = ['09:30', '10:00', '11:00', '14:00', '15:30', '16:30', '18:00']
  const sara = {
    slug: 'glowwithsara',
    handle: '@glowwithsara',
    displayName: 'Sara Chen',
  }

  const bookings: BookingWithCreator[] = []
  for (let i = 0; i < 12; i++) {
    const hoursAgo = i * 60 + (i % 4) * 7   // varied spacing
    const created = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
    const date = new Date(created)
    date.setDate(date.getDate() + 2 + (i % 5))   // appointment is in the future
    const service = business.services[i % business.services.length]
    const attributed = i % 3 !== 0

    bookings.push({
      id: `bk_${String(i).padStart(3, '0')}`,
      serviceName: service.name,
      price: service.price,
      customerName: customers[i % customers.length],
      date: date.toISOString().split('T')[0],
      time: times[i % times.length],
      status: i === 0 ? 'pending' : 'confirmed',
      createdAt: created.toISOString(),
      creator: attributed ? sara : null,
      isRepeat: false,
      commissionRate: attributed ? 0.10 : null,
      acquiredBy: null,
    })
  }
  return bookings
}

function computeBusinessStats(bookings: BookingWithCreator[]) {
  const confirmed = bookings.filter((b) => b.status !== 'cancelled')
  const totalRevenue = confirmed.reduce((sum, b) => sum + b.price, 0)
  const totalCreatorEarnings = confirmed
    .filter((b) => b.creator)
    .reduce((sum, b) => sum + calculateCreatorEarnings(b.price), 0)
  const totalPlatformFees = confirmed.reduce(
    (sum, b) => sum + calculatePlatformFee(b.price),
    0,
  )
  return {
    totalBookings: confirmed.length,
    totalRevenue,
    totalCreatorEarnings,
    totalPlatformFees,
  }
}

function rollupByCreator(bookings: BookingWithCreator[]): CreatorRollup[] {
  const map = new Map<string, CreatorRollup>()
  for (const b of bookings) {
    if (!b.creator || b.status === 'cancelled') continue
    const existing = map.get(b.creator.slug)
    if (existing) {
      existing.bookingCount += 1
      existing.revenue += b.price
      existing.earnings += calculateCreatorEarnings(b.price)
    } else {
      map.set(b.creator.slug, {
        slug: b.creator.slug,
        handle: b.creator.handle,
        displayName: b.creator.displayName,
        bookingCount: 1,
        revenue: b.price,
        earnings: calculateCreatorEarnings(b.price),
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
}

export interface AgendaBooking {
  id: string
  serviceName: string
  serviceDuration: number
  customerName: string
  customerEmail: string | null
  date: string
  time: string  // HH:MM
  endTime: string  // HH:MM
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show'
  isWalkin: boolean
  price: number
  creator: { slug: string; handle: string } | null
  staffId: string | null
  staffName: string | null
  isRepeat: boolean
  acquiredBy: { slug: string; handle: string } | null
}

export async function getBookingsForDate(
  businessSlug: string,
  dateISO: string,
): Promise<AgendaBooking[]> {
  if (!isSupabaseConfigured()) return []

  const db = createServerClient()
  const { data: bizRow } = await db
    .from('businesses')
    .select('id')
    .eq('slug', businessSlug)
    .single()
  if (!bizRow) return []

  const { data: rows } = await db
    .from('bookings')
    .select(`
      id, customer_name, customer_email, booking_date, booking_time, status, is_walkin, staff_id, is_repeat,
      services ( name, price, duration ),
      links ( creators ( slug, handle ) ),
      staff ( id, name ),
      customer_acquisitions ( creators ( slug, handle ) )
    `)
    .eq('business_id', bizRow.id)
    .eq('booking_date', dateISO)
    .order('booking_time', { ascending: true })

  return (rows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any): AgendaBooking => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      const link = Array.isArray(r.links) ? r.links[0] : r.links
      const creatorRow = link ? (Array.isArray(link.creators) ? link.creators[0] : link.creators) : null
      const staffRow = Array.isArray(r.staff) ? r.staff[0] : r.staff
      const acq = Array.isArray(r.customer_acquisitions) ? r.customer_acquisitions[0] : r.customer_acquisitions
      const acqCre = acq ? (Array.isArray(acq.creators) ? acq.creators[0] : acq.creators) : null

      const startMin = (() => {
        const [h, m] = String(r.booking_time).slice(0, 5).split(':').map(Number)
        return h * 60 + (m || 0)
      })()
      const duration = svc?.duration ?? 60
      const endMin = startMin + duration
      const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

      return {
        id: r.id,
        serviceName: svc?.name ?? 'Service',
        serviceDuration: duration,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        endTime: fmt(endMin),
        status: r.status,
        isWalkin: !!r.is_walkin,
        price: svc?.price ?? 0,
        creator: creatorRow ? { slug: creatorRow.slug, handle: creatorRow.handle } : null,
        staffId: r.staff_id ?? null,
        staffName: staffRow?.name ?? null,
        isRepeat: !!r.is_repeat,
        acquiredBy: acqCre ? { slug: acqCre.slug, handle: acqCre.handle } : null,
      }
    })
}

// ── Staff ────────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string
  businessId: string
  name: string
  role: string | null
  photoUrl: string | null
  isActive: boolean
  serviceIds: string[]   // services this staff can perform
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStaff(r: any, serviceIds: string[]): StaffMember {
  return {
    id: r.id,
    businessId: r.business_id,
    name: r.name,
    role: r.role ?? null,
    photoUrl: r.photo_url ?? null,
    isActive: r.is_active ?? true,
    serviceIds,
  }
}

export async function listStaff(businessSlug: string): Promise<StaffMember[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()
  const { data: biz } = await db.from('businesses').select('id').eq('slug', businessSlug).single()
  if (!biz) return []

  const { data: staffRows } = await db
    .from('staff')
    .select('*')
    .eq('business_id', biz.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const staffIds = (staffRows ?? []).map((s: { id: string }) => s.id)
  const { data: ssRows } = staffIds.length
    ? await db.from('staff_services').select('staff_id, service_id').in('staff_id', staffIds)
    : { data: [] }

  const servicesByStaff = new Map<string, string[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const ss of (ssRows ?? []) as any[]) {
    const cur = servicesByStaff.get(ss.staff_id) ?? []
    cur.push(ss.service_id)
    servicesByStaff.set(ss.staff_id, cur)
  }

  return (staffRows ?? []).map((r: { id: string }) =>
    rowToStaff(r, servicesByStaff.get(r.id) ?? []),
  )
}

export async function getStaffForService(
  businessSlug: string,
  serviceId: string,
): Promise<StaffMember[]> {
  const all = await listStaff(businessSlug)
  return all.filter((s) => s.serviceIds.includes(serviceId))
}

export async function createStaffMember(
  businessSlug: string,
  data: { name: string; role?: string; photoUrl?: string; serviceIds: string[] },
): Promise<StaffMember> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
  const db = createServerClient()

  const { data: biz } = await db.from('businesses').select('id').eq('slug', businessSlug).single()
  if (!biz) throw new Error('Business not found')

  const { data: row, error } = await db
    .from('staff')
    .insert({
      business_id: biz.id,
      name: data.name,
      role: data.role ?? null,
      photo_url: data.photoUrl ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  if (data.serviceIds.length > 0) {
    const links = data.serviceIds.map((sid) => ({ staff_id: row.id, service_id: sid }))
    const { error: linkErr } = await db.from('staff_services').insert(links)
    if (linkErr) throw new Error(linkErr.message)
  }

  return rowToStaff(row, data.serviceIds)
}

export async function updateStaffMember(
  staffId: string,
  data: { name?: string; role?: string; photoUrl?: string; serviceIds?: string[] },
) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
  const db = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}
  if (data.name !== undefined) update.name = data.name
  if (data.role !== undefined) update.role = data.role || null
  if (data.photoUrl !== undefined) update.photo_url = data.photoUrl || null
  if (Object.keys(update).length > 0) {
    const { error } = await db.from('staff').update(update).eq('id', staffId)
    if (error) throw new Error(error.message)
  }

  if (data.serviceIds) {
    await db.from('staff_services').delete().eq('staff_id', staffId)
    if (data.serviceIds.length > 0) {
      const links = data.serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid }))
      const { error } = await db.from('staff_services').insert(links)
      if (error) throw new Error(error.message)
    }
  }
}

export async function deactivateStaffMember(staffId: string) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
  const db = createServerClient()
  const { error } = await db.from('staff').update({ is_active: false }).eq('id', staffId)
  if (error) throw new Error(error.message)
}

// ── Staff schedule (per day-of-week working hours) ──────────────────────────

export interface StaffScheduleEntry {
  dayOfWeek: number   // 0=Sun, 6=Sat
  startTime: string   // HH:MM
  endTime: string     // HH:MM
  isAvailable: boolean
}

export async function getStaffSchedule(staffId: string): Promise<StaffScheduleEntry[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()
  const { data } = await db
    .from('staff_schedules')
    .select('day_of_week, start_time, end_time, is_available')
    .eq('staff_id', staffId)
    .order('day_of_week', { ascending: true })
  return (data ?? []).map((r: { day_of_week: number; start_time: string; end_time: string; is_available: boolean }) => ({
    dayOfWeek: r.day_of_week,
    startTime: r.start_time.slice(0, 5),
    endTime: r.end_time.slice(0, 5),
    isAvailable: r.is_available,
  }))
}

export async function setStaffSchedule(
  staffId: string,
  schedule: StaffScheduleEntry[],
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
  const db = createServerClient()
  // Wipe + replace (simple, idempotent)
  await db.from('staff_schedules').delete().eq('staff_id', staffId)
  if (schedule.length === 0) return
  const rows = schedule.map((s) => ({
    staff_id: staffId,
    day_of_week: s.dayOfWeek,
    start_time: s.startTime,
    end_time: s.endTime,
    is_available: s.isAvailable,
  }))
  const { error } = await db.from('staff_schedules').insert(rows)
  if (error) throw new Error(error.message)
}

// ── Staff blocked dates (sick days, leave) — stored in time_blocks ──────────

export interface StaffBlock {
  id: string
  staffId: string
  blockDate: string  // YYYY-MM-DD
  startTime: string
  endTime: string
  reason: string | null
}

export async function listStaffBlocks(staffId: string): Promise<StaffBlock[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await db
    .from('time_blocks')
    .select('id, staff_id, block_date, start_time, end_time, reason')
    .eq('staff_id', staffId)
    .gte('block_date', today)
    .order('block_date', { ascending: true })
  return (data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      id: r.id,
      staffId: r.staff_id,
      blockDate: r.block_date,
      startTime: String(r.start_time).slice(0, 5),
      endTime: String(r.end_time).slice(0, 5),
      reason: r.reason ?? null,
    }),
  )
}

export async function createStaffBlock(
  staffId: string,
  data: { blockDate: string; startTime?: string; endTime?: string; reason?: string },
): Promise<StaffBlock> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
  const db = createServerClient()
  const { data: staff } = await db.from('staff').select('business_id').eq('id', staffId).single()
  if (!staff) throw new Error('Staff not found')

  const { data: row, error } = await db
    .from('time_blocks')
    .insert({
      business_id: staff.business_id,
      staff_id: staffId,
      block_date: data.blockDate,
      start_time: data.startTime ?? '00:00',
      end_time: data.endTime ?? '23:59',
      reason: data.reason ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return {
    id: row.id,
    staffId,
    blockDate: row.block_date,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    reason: row.reason,
  }
}

export async function deleteStaffBlock(blockId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
  const db = createServerClient()
  const { error } = await db.from('time_blocks').delete().eq('id', blockId)
  if (error) throw new Error(error.message)
}

// ── Get bookings for a single staff on a date (for their schedule view) ─────

export async function getStaffBookingsForDate(
  staffId: string,
  dateISO: string,
): Promise<AgendaBooking[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()
  const { data: rows } = await db
    .from('bookings')
    .select(`
      id, customer_name, customer_email, booking_date, booking_time, status, is_walkin,
      services ( name, price, duration ),
      links ( creators ( slug, handle ) )
    `)
    .eq('staff_id', staffId)
    .eq('booking_date', dateISO)
    .order('booking_time', { ascending: true })

  return (rows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any): AgendaBooking => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      const link = Array.isArray(r.links) ? r.links[0] : r.links
      const cre = link ? (Array.isArray(link.creators) ? link.creators[0] : link.creators) : null
      const startMin = (() => {
        const [h, m] = String(r.booking_time).slice(0, 5).split(':').map(Number)
        return h * 60 + (m || 0)
      })()
      const duration = svc?.duration ?? 60
      const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
      return {
        id: r.id,
        serviceName: svc?.name ?? 'Service',
        serviceDuration: duration,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        endTime: fmt(startMin + duration),
        status: r.status,
        isWalkin: !!r.is_walkin,
        price: svc?.price ?? 0,
        creator: cre ? { slug: cre.slug, handle: cre.handle } : null,
        staffId: staffId,
        staffName: null,  // page already knows the staff
        isRepeat: false,
        acquiredBy: null,
      }
    })
}

export async function getStaffById(staffId: string): Promise<StaffMember | null> {
  if (!isSupabaseConfigured()) return null
  const db = createServerClient()
  const { data: row } = await db.from('staff').select('*').eq('id', staffId).single()
  if (!row) return null
  const { data: ssRows } = await db.from('staff_services').select('service_id').eq('staff_id', staffId)
  return rowToStaff(row, (ssRows ?? []).map((r: { service_id: string }) => r.service_id))
}

// ── Auto-assign: pick the best staff for a booking ──────────────────────────

export async function pickEligibleStaff(opts: {
  businessId: string
  serviceId: string
  bookingDate: string
  bookingTime: string  // HH:MM
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const db = createServerClient()

  // Service info
  const { data: svc } = await db
    .from('services')
    .select('duration, buffer_minutes')
    .eq('id', opts.serviceId)
    .single()
  const duration = (svc?.duration ?? 60) + (svc?.buffer_minutes ?? 0)

  // Eligible staff: active + can do the service
  const { data: staffRows } = await db
    .from('staff')
    .select('id')
    .eq('business_id', opts.businessId)
    .eq('is_active', true)
  const allStaffIds = (staffRows ?? []).map((s: { id: string }) => s.id)
  if (allStaffIds.length === 0) return null

  const { data: ssRows } = await db
    .from('staff_services')
    .select('staff_id')
    .eq('service_id', opts.serviceId)
    .in('staff_id', allStaffIds)
  const eligibleIds = (ssRows ?? []).map((r: { staff_id: string }) => r.staff_id)
  if (eligibleIds.length === 0) return null

  // Existing bookings for this date for these staff
  const { data: bookings } = await db
    .from('bookings')
    .select('staff_id, booking_time, services(duration, buffer_minutes)')
    .in('staff_id', eligibleIds)
    .eq('booking_date', opts.bookingDate)
    .in('status', ['pending', 'confirmed'])

  // Schedule + blocks per staff
  const { data: schedules } = await db
    .from('staff_schedules')
    .select('staff_id, day_of_week, start_time, end_time, is_available')
    .in('staff_id', eligibleIds)

  const { data: blocks } = await db
    .from('time_blocks')
    .select('staff_id, block_date, recurring_dow, start_time, end_time')
    .in('staff_id', eligibleIds)

  const date = new Date(`${opts.bookingDate}T00:00:00`)
  const dow = date.getDay()
  const [bh, bm] = opts.bookingTime.split(':').map(Number)
  const startMin = bh * 60 + (bm || 0)
  const endMin = startMin + duration

  function timeToMin(t: string) {
    const [h, m] = String(t).slice(0, 5).split(':').map(Number)
    return h * 60 + (m || 0)
  }

  // Find first eligible staff who is free
  for (const staffId of eligibleIds) {
    // Check schedule (if defined)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todays = (schedules ?? []).filter((s: any) => s.staff_id === staffId && s.day_of_week === dow)
    if (todays.length > 0) {
      const sched = todays[0]
      if (!sched.is_available) continue
      if (startMin < timeToMin(sched.start_time) || endMin > timeToMin(sched.end_time)) continue
    }
    // If no schedule row, fall through (assume business hours; the slot was already validated by availability engine)

    // Conflicts with existing bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myBookings = (bookings ?? []).filter((b: any) => b.staff_id === staffId)
    const hasConflict = myBookings.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (b: any) => {
        const sv = Array.isArray(b.services) ? b.services[0] : b.services
        const bStart = timeToMin(b.booking_time)
        const bEnd = bStart + (sv?.duration ?? 60) + (sv?.buffer_minutes ?? 0)
        return startMin < bEnd && bStart < endMin
      },
    )
    if (hasConflict) continue

    // Blocks
    const myBlocks = (blocks ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (b: any) => b.staff_id === staffId &&
        (b.block_date === opts.bookingDate || b.recurring_dow === dow),
    )
    const hasBlock = myBlocks.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (b: any) => {
        const bStart = timeToMin(b.start_time)
        const bEnd = timeToMin(b.end_time)
        return startMin < bEnd && bStart < endMin
      },
    )
    if (hasBlock) continue

    return staffId
  }

  return null
}

// ── Walk-in bookings ────────────────────────────────────────────────────────

export async function createWalkinBooking(data: {
  businessSlug: string
  serviceId: string
  staffId?: string
  customerName: string
  bookingDate: string
  bookingTime: string
}) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
  const db = createServerClient()

  const { data: biz } = await db.from('businesses').select('id').eq('slug', data.businessSlug).single()
  if (!biz) throw new Error('Business not found')

  const { data: row, error } = await db
    .from('bookings')
    .insert({
      business_id: biz.id,
      service_id: data.serviceId,
      staff_id: data.staffId ?? null,
      customer_name: data.customerName || 'Walk-in',
      customer_contact: 'walk-in',  // legacy required field
      booking_date: data.bookingDate,
      booking_time: data.bookingTime,
      status: 'confirmed',
      payment_status: null,
      is_walkin: true,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row
}

// ── Recent bookings for the Bookings tab (with optional status filter) ─────

export async function listBusinessBookings(
  businessSlug: string,
  opts?: { status?: AgendaBooking['status']; limit?: number },
): Promise<AgendaBooking[]> {
  if (!isSupabaseConfigured()) return []
  const db = createServerClient()
  const { data: bizRow } = await db.from('businesses').select('id').eq('slug', businessSlug).single()
  if (!bizRow) return []

  let query = db
    .from('bookings')
    .select(`
      id, customer_name, customer_email, booking_date, booking_time, status, is_walkin, staff_id, created_at, is_repeat,
      services ( name, price, duration ),
      links ( creators ( slug, handle ) ),
      staff ( id, name ),
      customer_acquisitions ( creators ( slug, handle ) )
    `)
    .eq('business_id', bizRow.id)
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })
    .limit(opts?.limit ?? 100)

  if (opts?.status) query = query.eq('status', opts.status)

  const { data: rows } = await query

  return (rows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any): AgendaBooking => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      const link = Array.isArray(r.links) ? r.links[0] : r.links
      const cre = link ? (Array.isArray(link.creators) ? link.creators[0] : link.creators) : null
      const staffRow = Array.isArray(r.staff) ? r.staff[0] : r.staff
      const acq = Array.isArray(r.customer_acquisitions) ? r.customer_acquisitions[0] : r.customer_acquisitions
      const acqCre = acq ? (Array.isArray(acq.creators) ? acq.creators[0] : acq.creators) : null
      const startMin = (() => {
        const [h, m] = String(r.booking_time).slice(0, 5).split(':').map(Number)
        return h * 60 + (m || 0)
      })()
      const duration = svc?.duration ?? 60
      const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
      return {
        id: r.id,
        serviceName: svc?.name ?? 'Service',
        serviceDuration: duration,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        endTime: fmt(startMin + duration),
        status: r.status,
        isWalkin: !!r.is_walkin,
        price: svc?.price ?? 0,
        creator: cre ? { slug: cre.slug, handle: cre.handle } : null,
        staffId: r.staff_id ?? null,
        staffName: staffRow?.name ?? null,
        isRepeat: !!r.is_repeat,
        acquiredBy: acqCre ? { slug: acqCre.slug, handle: acqCre.handle } : null,
      }
    })
}

// ── Bookings range query (for week/month views) ─────────────────────────────

export async function getBookingsForRange(
  businessSlug: string,
  startDate: string,
  endDate: string,
): Promise<AgendaBooking[]> {
  if (!isSupabaseConfigured()) return []

  const db = createServerClient()
  const { data: bizRow } = await db.from('businesses').select('id').eq('slug', businessSlug).single()
  if (!bizRow) return []

  const { data: rows } = await db
    .from('bookings')
    .select(`
      id, customer_name, customer_email, booking_date, booking_time, status, is_walkin, staff_id,
      services ( name, price, duration ),
      links ( creators ( slug, handle ) ),
      staff ( id, name )
    `)
    .eq('business_id', bizRow.id)
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true })

  return (rows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any): AgendaBooking => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      const link = Array.isArray(r.links) ? r.links[0] : r.links
      const creatorRow = link
        ? Array.isArray(link.creators) ? link.creators[0] : link.creators
        : null
      const staffRow = Array.isArray(r.staff) ? r.staff[0] : r.staff
      const startMin = (() => {
        const [h, m] = String(r.booking_time).slice(0, 5).split(':').map(Number)
        return h * 60 + (m || 0)
      })()
      const duration = svc?.duration ?? 60
      const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
      return {
        id: r.id,
        serviceName: svc?.name ?? 'Service',
        serviceDuration: duration,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        endTime: fmt(startMin + duration),
        status: r.status,
        isWalkin: !!r.is_walkin,
        price: svc?.price ?? 0,
        creator: creatorRow ? { slug: creatorRow.slug, handle: creatorRow.handle } : null,
        staffId: r.staff_id ?? null,
        staffName: staffRow?.name ?? null,
        isRepeat: false,
        acquiredBy: null,
      }
    })
}

export async function getBusinessStripeStatus(businessSlug: string): Promise<{
  hasAccount: boolean
  accountId: string | null
}> {
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
}

export async function getBusinessDashboard(
  businessSlug: string,
): Promise<BusinessDashboardData | null> {
  if (!isSupabaseConfigured()) {
    const business = seedBusinesses[businessSlug]
    if (!business) return null
    const bookings = generateMockBookings(business)
    return {
      business,
      bookings,
      stats: computeBusinessStats(bookings),
      creatorRollups: rollupByCreator(bookings),
    }
  }

  const db = createServerClient()
  const { data: bizRow } = await db
    .from('businesses')
    .select('*, services(*)')
    .eq('slug', businessSlug)
    .single()

  if (!bizRow) return null
  const business = rowToBusiness(bizRow)

  const { data: bookingRows } = await db
    .from('bookings')
    .select(`
      id, customer_name, booking_date, booking_time, status, created_at, is_repeat, commission_rate,
      services ( name, price ),
      links (
        creators ( slug, handle, display_name )
      ),
      customer_acquisitions (
        creators ( slug, handle )
      )
    `)
    .eq('business_id', bizRow.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings: BookingWithCreator[] = (bookingRows ?? []).map((r: any) => {
    const acq = Array.isArray(r.customer_acquisitions) ? r.customer_acquisitions[0] : r.customer_acquisitions
    const acqCre = acq ? (Array.isArray(acq.creators) ? acq.creators[0] : acq.creators) : null
    return {
      id: r.id,
      serviceName: r.services?.name ?? 'Unknown',
      price: r.services?.price ?? 0,
      customerName: r.customer_name,
      date: r.booking_date,
      time: r.booking_time,
      status: r.status,
      createdAt: r.created_at,
      creator: r.links?.creators
        ? {
            slug: r.links.creators.slug,
            handle: r.links.creators.handle,
            displayName: r.links.creators.display_name,
          }
        : null,
      isRepeat: !!r.is_repeat,
      commissionRate: r.commission_rate ?? null,
      acquiredBy: acqCre ? { slug: acqCre.slug, handle: acqCre.handle } : null,
    }
  })

  return {
    business,
    bookings,
    stats: computeBusinessStats(bookings),
    creatorRollups: rollupByCreator(bookings),
  }
}

export async function getCreatorDashboard(
  creatorSlug: string,
): Promise<CreatorDashboardData | null> {
  if (!isSupabaseConfigured()) {
    const creator = seedCreators[creatorSlug]
    if (!creator) return null

    // Build mock data from the creator's linked businesses
    const linkedBusinesses = creator.linkedBusinessSlugs
      .map((s) => seedBusinesses[s])
      .filter(Boolean) as Business[]

    const links: LinkPerformance[] = linkedBusinesses.map((biz, idx) => {
      const bookings = generateMockBookings(biz).filter((b) => b.creator?.slug === creatorSlug)
      const earnings = bookings.reduce((s, b) => s + calculateCreatorEarnings(b.price), 0)
      const seedLink = seedLinks.find(
        (l) => l.creatorSlug === creatorSlug && l.businessSlug === biz.slug,
      )
      return {
        linkId: seedLink?.id ?? `seed_${biz.slug}`,
        business: {
          slug: biz.slug,
          name: biz.name,
          coverGradient: biz.coverGradient,
          coverPhotoUrl: biz.coverPhotoUrl,
        },
        status: seedLink?.status ?? 'active',
        contentUrl: seedLink?.contentUrl ?? null,
        platform: seedLink?.platform ?? null,
        clicks: 1247 - idx * 100,
        bookings: bookings.length,
        earnings,
        customersAcquired: 0,
        customersRebooked: 0,
      }
    })

    const totalClicks = links.reduce((s, l) => s + l.clicks, 0)
    const totalBookings = links.reduce((s, l) => s + l.bookings, 0)
    const totalEarnings = links.reduce((s, l) => s + l.earnings, 0)

    // Mock recent activity
    const recentActivity: ActivityEvent[] = []
    for (let i = 0; i < 8; i++) {
      const isBooking = i % 3 === 1
      const created = new Date(Date.now() - i * 9 * 60 * 60 * 1000)
      if (isBooking) {
        const biz = linkedBusinesses[0]
        const svc = biz.services[i % biz.services.length]
        recentActivity.push({
          id: `act_${i}`,
          type: 'booking',
          label: `Booking · ${svc.name}`,
          amount: calculateCreatorEarnings(svc.price),
          createdAt: created.toISOString(),
        })
      } else {
        recentActivity.push({
          id: `act_${i}`,
          type: 'click',
          label: `Link click · ${linkedBusinesses[0].name}`,
          createdAt: created.toISOString(),
        })
      }
    }

    return {
      creator,
      totals: {
        totalClicks,
        totalBookings,
        totalEarnings,
        pendingPayout: totalEarnings,
        firstBookingEarnings: totalEarnings,
        repeatEarnings: 0,
        customersAcquired: 0,
        customersInWindow: 0,
        lifetimeValue: 0,
      },
      links,
      recentActivity,
    }
  }

  // Real Supabase path
  const db = createServerClient()
  const { data: creatorRow } = await db
    .from('creators')
    .select('*')
    .eq('slug', creatorSlug)
    .eq('is_active', true)
    .single()

  if (!creatorRow) return null

  const { data: linkRows } = await db
    .from('links')
    .select(`
      id, click_count, status, content_url, platform,
      businesses ( slug, name, category, cover_photo_url )
    `)
    .eq('creator_id', creatorRow.id)
    .eq('is_active', true)

  // For each link, count bookings + sum earnings
  const linkIds = (linkRows ?? []).map((l: any) => l.id)
  const { data: bookingRows } = linkIds.length
    ? await db
        .from('bookings')
        .select('id, link_id, created_at, status, is_repeat, commission_rate, customer_phone, services ( name, price )')
        .in('link_id', linkIds)
        .neq('status', 'cancelled')
        .neq('status', 'declined')
    : { data: [] }

  // Acquisitions for this creator → customers acquired + still in window
  const { data: acqRows } = await db
    .from('customer_acquisitions')
    .select('id, link_id, customer_phone, expires_at, is_active')
    .eq('creator_id', creatorRow.id)

  const now = new Date()

  // Per-link aggregates
  const acquiredByLink = new Map<string, Set<string>>()
  const rebookedByLink = new Map<string, Set<string>>()

  for (const lid of linkIds) {
    acquiredByLink.set(lid, new Set())
    rebookedByLink.set(lid, new Set())
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of (acqRows ?? []) as any[]) {
    if (!a.link_id) continue
    const set = acquiredByLink.get(a.link_id)
    if (set) set.add(a.customer_phone)
  }

  // Determine which acquired phones came back (have a repeat booking)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repeatBookingPhones = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const b of (bookingRows ?? []) as any[]) {
    if (b.is_repeat && b.customer_phone) repeatBookingPhones.add(b.customer_phone)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of (acqRows ?? []) as any[]) {
    if (a.link_id && repeatBookingPhones.has(a.customer_phone)) {
      const set = rebookedByLink.get(a.link_id)
      if (set) set.add(a.customer_phone)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links: LinkPerformance[] = (linkRows ?? []).map((l: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkBookings = (bookingRows ?? []).filter((b: any) => b.link_id === l.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earnings = linkBookings.reduce((s: number, b: any) => {
      const price = b.services?.price ?? 0
      const rate = b.commission_rate ?? 0.10  // backstop for legacy bookings
      return s + Math.round(price * rate)
    }, 0)
    return {
      linkId: l.id,
      business: {
        slug: l.businesses?.slug ?? '',
        name: l.businesses?.name ?? 'Unknown',
        coverGradient: gradientForCategory(l.businesses?.category ?? ''),
        coverPhotoUrl: l.businesses?.cover_photo_url ?? null,
      },
      status: (l.status ?? 'pending') as LinkStatus,
      contentUrl: l.content_url ?? null,
      platform: l.platform ?? null,
      clicks: l.click_count ?? 0,
      bookings: linkBookings.length,
      earnings,
      customersAcquired: acquiredByLink.get(l.id)?.size ?? 0,
      customersRebooked: rebookedByLink.get(l.id)?.size ?? 0,
    }
  })

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0)
  const totalBookings = links.reduce((s, l) => s + l.bookings, 0)
  const totalEarnings = links.reduce((s, l) => s + l.earnings, 0)

  // Split first vs repeat earnings using booking rates
  let firstBookingEarnings = 0
  let repeatEarnings = 0
  let lifetimeValue = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const b of (bookingRows ?? []) as any[]) {
    const price = b.services?.price ?? 0
    const earned = Math.round(price * (b.commission_rate ?? 0.10))
    if (b.is_repeat) repeatEarnings += earned
    else firstBookingEarnings += earned
    lifetimeValue += price
  }

  const customersAcquired = (acqRows ?? []).length
  const customersInWindow = (acqRows ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.is_active && new Date(a.expires_at) > now,
  ).length

  // Recent activity = recent bookings + recent attribution clicks
  const { data: activityRows } = linkIds.length
    ? await db
        .from('attribution_events')
        .select(`
          id, event_type, created_at,
          links ( businesses ( name ) ),
          bookings ( services ( name, price ) )
        `)
        .in('link_id', linkIds)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentActivity: ActivityEvent[] = (activityRows ?? []).map((a: any) => {
    if (a.event_type === 'booking_confirmed' && a.bookings?.services) {
      return {
        id: a.id,
        type: 'booking' as const,
        label: `Booking · ${a.bookings.services.name}`,
        amount: calculateCreatorEarnings(a.bookings.services.price ?? 0),
        createdAt: a.created_at,
      }
    }
    return {
      id: a.id,
      type: 'click' as const,
      label: `Link click · ${a.links?.businesses?.name ?? 'Unknown'}`,
      createdAt: a.created_at,
    }
  })

  const creator = rowToCreator(creatorRow, links.map((l) => l.business.slug))

  return {
    creator,
    totals: {
      totalClicks,
      totalBookings,
      totalEarnings,
      pendingPayout: totalEarnings,
      firstBookingEarnings,
      repeatEarnings,
      customersAcquired,
      customersInWindow,
      lifetimeValue,
    },
    links,
    recentActivity,
  }
}

export async function listBusinesses(): Promise<Business[]> {
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
}
