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

export async function createBooking(data: {
  serviceId: string
  businessId: string
  linkId?: string
  customerName: string
  customerContact: string
  bookingDate: string
  bookingTime: string
}) {
  if (!isSupabaseConfigured()) {
    // Return a mock confirmation for the demo
    return { id: `demo_${Date.now()}`, status: 'pending' }
  }

  const db = createServerClient()

  const { data: booking, error } = await db
    .from('bookings')
    .insert({
      service_id: data.serviceId,
      business_id: data.businessId,
      link_id: data.linkId ?? null,
      customer_name: data.customerName,
      customer_contact: data.customerContact,
      booking_date: data.bookingDate,
      booking_time: data.bookingTime,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Record attribution event
  if (data.linkId) {
    await db.from('attribution_events').insert({
      link_id: data.linkId,
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
      id, customer_name, booking_date, booking_time, status, created_at,
      services ( name, price ),
      links (
        creators ( slug, handle, display_name )
      )
    `)
    .eq('business_id', bizRow.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings: BookingWithCreator[] = (bookingRows ?? []).map((r: any) => ({
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
  }))

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
        clicks: 1247 - idx * 100,   // mock
        bookings: bookings.length,
        earnings,
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
        .select('id, link_id, created_at, status, services ( name, price )')
        .in('link_id', linkIds)
        .neq('status', 'cancelled')
        .neq('status', 'declined')
    : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links: LinkPerformance[] = (linkRows ?? []).map((l: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkBookings = (bookingRows ?? []).filter((b: any) => b.link_id === l.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earnings = linkBookings.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: number, b: any) => s + calculateCreatorEarnings(b.services?.price ?? 0),
      0,
    )
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
    }
  })

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0)
  const totalBookings = links.reduce((s, l) => s + l.bookings, 0)
  const totalEarnings = links.reduce((s, l) => s + l.earnings, 0)

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
