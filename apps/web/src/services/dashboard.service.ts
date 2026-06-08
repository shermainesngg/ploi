import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  businesses as seedBusinesses,
  creators as seedCreators,
  links as seedLinks,
} from '@/lib/seed-data'
import { rowToBusiness, rowToCreator, gradientForCategory } from '@/lib/mappers'
import { calculateCreatorEarnings, calculatePlatformFee } from '@/lib/constants'
import type {
  Business,
  BookingWithCreator,
  BusinessDashboardData,
  CreatorDashboardData,
  CreatorRollup,
  LinkPerformance,
  ActivityEvent,
  LinkStatus,
} from '@/lib/types'

/** One row in the per-creator bookings feed (paginated, business-dashboard only). */
export interface CreatorBookingFeedItem {
  id: string
  serviceName: string
  price: number
  customerName: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  isRepeat: boolean
  commissionRate: number | null
  contentId: string | null
}

/** Filters the business can apply to the per-creator bookings feed. */
export interface CreatorBookingFilters {
  status?: 'confirmed' | 'pending' | 'cancelled'
  type?: 'new' | 'repeat'
  videoId?: string
  range?: '30' | '90' | 'all'
}

/** Whole-dataset aggregates for the per-creator stats page (filters don't apply). */
export interface CreatorBookingStats {
  bookingCount: number
  revenue: number
  commission: number
  repeats: number
  /** Per-video booking performance, keyed by content_id (non-cancelled). */
  byVideo: Record<string, { bookingCount: number; revenue: number }>
}

export interface AgendaBooking {
  id: string
  serviceName: string
  serviceDuration: number
  customerName: string
  customerEmail: string | null
  date: string
  time: string
  endTime: string
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show'
  isWalkin: boolean
  price: number
  creator: { slug: string; handle: string } | null
  staffId: string | null
  staffName: string | null
  isRepeat: boolean
  acquiredBy: { slug: string; handle: string } | null
}

function generateMockBookings(business: Business): BookingWithCreator[] {
  const customers = [
    'Lia P.', 'May K.', 'Nicha T.', 'Pim S.', 'Aom J.',
    'Bee R.', 'Tan C.', 'Mint L.', 'Ploy W.', 'Fern S.',
    'Ying H.', 'Nan B.',
  ]
  const times = ['09:30', '10:00', '11:00', '14:00', '15:30', '16:30', '18:00']
  const sara = { slug: 'glowwithsara', handle: '@glowwithsara', displayName: 'Sara Chen' }

  const bookings: BookingWithCreator[] = []
  for (let i = 0; i < 12; i++) {
    const hoursAgo = i * 60 + (i % 4) * 7
    const created = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
    const date = new Date(created)
    date.setDate(date.getDate() + 2 + (i % 5))
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
      contentId: null,
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
    (sum, b) => sum + calculatePlatformFee(b.price), 0,
  )
  return { totalBookings: confirmed.length, totalRevenue, totalCreatorEarnings, totalPlatformFees }
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

function timeToMin(t: string) {
  const [h, m] = String(t).slice(0, 5).split(':').map(Number)
  return h * 60 + (m || 0)
}

function formatEndTime(startTime: string, duration: number) {
  const startMin = timeToMin(startTime)
  const endMin = startMin + duration
  return `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAgendaBooking(r: any): AgendaBooking {
  const svc = Array.isArray(r.services) ? r.services[0] : r.services
  const link = Array.isArray(r.links) ? r.links[0] : r.links
  const creatorRow = link ? (Array.isArray(link.creators) ? link.creators[0] : link.creators) : null
  const staffRow = Array.isArray(r.staff) ? r.staff[0] : r.staff
  const acq = Array.isArray(r.customer_acquisitions) ? r.customer_acquisitions[0] : r.customer_acquisitions
  const acqCre = acq ? (Array.isArray(acq.creators) ? acq.creators[0] : acq.creators) : null
  const duration = svc?.duration ?? 60

  return {
    id: r.id,
    serviceName: svc?.name ?? 'Service',
    serviceDuration: duration,
    customerName: r.customer_name,
    customerEmail: r.customer_email ?? null,
    date: r.booking_date,
    time: String(r.booking_time).slice(0, 5),
    endTime: formatEndTime(r.booking_time, duration),
    status: r.status,
    isWalkin: !!r.is_walkin,
    price: svc?.price ?? 0,
    creator: creatorRow ? { slug: creatorRow.slug, handle: creatorRow.handle } : null,
    staffId: r.staff_id ?? null,
    staffName: staffRow?.name ?? null,
    isRepeat: !!r.is_repeat,
    acquiredBy: acqCre ? { slug: acqCre.slug, handle: acqCre.handle } : null,
  }
}

/**
 * Resolve which bookings belong to a creator at a business: those made via the
 * creator's link, plus repeat bookings auto-attributed to them as the acquiring
 * creator. Returns a PostgREST `.or()` clause string, or null if the creator has
 * no links/acquisitions here (→ caller short-circuits to an empty result).
 */
async function resolveCreatorBookingScope(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  businessSlug: string,
  creatorSlug: string,
): Promise<{ businessId: string; orClause: string } | null> {
  const [{ data: bizRow }, { data: creatorRow }] = await Promise.all([
    db.from('businesses').select('id').eq('slug', businessSlug).single(),
    db.from('creators').select('id').eq('slug', creatorSlug).single(),
  ])
  if (!bizRow || !creatorRow) return null

  const [{ data: linkRows }, { data: acqRows }] = await Promise.all([
    db.from('links').select('id').eq('creator_id', creatorRow.id).eq('business_id', bizRow.id),
    db.from('customer_acquisitions').select('id').eq('creator_id', creatorRow.id).eq('business_id', bizRow.id),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkIds = (linkRows ?? []).map((r: any) => r.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acqIds = (acqRows ?? []).map((r: any) => r.id)

  const clauses: string[] = []
  if (linkIds.length) clauses.push(`link_id.in.(${linkIds.join(',')})`)
  if (acqIds.length) clauses.push(`acquisition_id.in.(${acqIds.join(',')})`)
  if (!clauses.length) return null

  return { businessId: bizRow.id, orClause: clauses.join(',') }
}

/** Created-at cutoff (ISO) for a range filter, or null for 'all'. */
function rangeCutoff(range?: '30' | '90' | 'all'): string | null {
  if (!range || range === 'all') return null
  const days = range === '90' ? 90 : 30
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/** Seed-data fallback: this creator's mock bookings at a business, newest first. */
function mockCreatorBookings(businessSlug: string, creatorSlug: string): BookingWithCreator[] {
  const business = seedBusinesses[businessSlug]
  if (!business) return []
  return generateMockBookings(business)
    .filter((b) => b.creator?.slug === creatorSlug || b.acquiredBy?.slug === creatorSlug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const DashboardService = {
  async getBusinessDashboard(businessSlug: string): Promise<BusinessDashboardData | null> {
    if (!isSupabaseConfigured()) {
      const business = seedBusinesses[businessSlug]
      if (!business) return null
      const bookings = generateMockBookings(business)
      return { business, bookings, stats: computeBusinessStats(bookings), creatorRollups: rollupByCreator(bookings) }
    }

    const db = createServerClient()
    const { data: bizRow } = await db
      .from('businesses')
      .select('*, services(*), locations(*)')
      .eq('slug', businessSlug)
      .single()

    if (!bizRow) return null
    const business = rowToBusiness(bizRow)

    const { data: bookingRows } = await db
      .from('bookings')
      .select(`
        id, customer_name, booking_date, booking_time, status, created_at, is_repeat, commission_rate, content_id,
        services ( name, price ),
        links ( creators ( slug, handle, display_name ) ),
        customer_acquisitions!bookings_acquisition_id_fkey ( creators ( slug, handle ) )
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
          ? { slug: r.links.creators.slug, handle: r.links.creators.handle, displayName: r.links.creators.display_name }
          : null,
        isRepeat: !!r.is_repeat,
        commissionRate: r.commission_rate ?? null,
        acquiredBy: acqCre ? { slug: acqCre.slug, handle: acqCre.handle } : null,
        contentId: r.content_id ?? null,
      }
    })

    return { business, bookings, stats: computeBusinessStats(bookings), creatorRollups: rollupByCreator(bookings) }
  },

  async getCreatorDashboard(creatorSlug: string): Promise<CreatorDashboardData | null> {
    if (!isSupabaseConfigured()) {
      const creator = seedCreators[creatorSlug]
      if (!creator) return null

      const linkedBusinesses = creator.linkedBusinessSlugs
        .map((s) => seedBusinesses[s])
        .filter(Boolean) as Business[]

      const links: LinkPerformance[] = linkedBusinesses.map((biz, idx) => {
        const bookings = generateMockBookings(biz).filter((b) => b.creator?.slug === creatorSlug)
        const earnings = bookings.reduce((s, b) => s + calculateCreatorEarnings(b.price), 0)
        const seedLink = seedLinks.find((l) => l.creatorSlug === creatorSlug && l.businessSlug === biz.slug)
        return {
          linkId: seedLink?.id ?? `seed_${biz.slug}`,
          business: { slug: biz.slug, name: biz.name, coverGradient: biz.coverGradient, coverPhotoUrl: biz.coverPhotoUrl },
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

      const recentActivity: ActivityEvent[] = []
      for (let i = 0; i < 16; i++) {
        const isBooking = i % 3 === 1
        const created = new Date(Date.now() - i * 9 * 60 * 60 * 1000)
        if (isBooking) {
          const biz = linkedBusinesses[0]
          const svc = biz.services[i % biz.services.length]
          const isRepeat = i % 6 === 1
          recentActivity.push({
            id: `act_${i}`,
            type: 'booking',
            bookingKind: isRepeat ? 'repeat' : 'first',
            label: `${isRepeat ? 'Repeat booking' : 'Booking'} · ${svc.name}`,
            amount: calculateCreatorEarnings(svc.price),
            createdAt: created.toISOString(),
          })
        } else {
          recentActivity.push({ id: `act_${i}`, type: 'click', label: `Link click · ${linkedBusinesses[0].name}`, createdAt: created.toISOString() })
        }
      }

      return {
        creator,
        totals: { totalClicks, totalBookings, totalEarnings, pendingPayout: totalEarnings, firstBookingEarnings: totalEarnings, repeatEarnings: 0, customersAcquired: 0, customersInWindow: 0, lifetimeValue: 0 },
        links,
        recentActivity,
      }
    }

    const db = createServerClient()
    const { data: creatorRow } = await db.from('creators').select('*').eq('slug', creatorSlug).eq('is_active', true).single()
    if (!creatorRow) return null

    const { data: linkRows } = await db.from('links').select(`id, click_count, status, content_url, platform, businesses ( slug, name, category, cover_photo_url )`).eq('creator_id', creatorRow.id).eq('is_active', true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkIds = (linkRows ?? []).map((l: any) => l.id)
    const { data: bookingRows } = linkIds.length
      ? await db.from('bookings').select('id, link_id, created_at, status, is_repeat, commission_rate, customer_phone, services ( name, price )').in('link_id', linkIds).neq('status', 'cancelled').neq('status', 'declined')
      : { data: [] }

    const { data: acqRows } = await db.from('customer_acquisitions').select('id, link_id, customer_phone, expires_at, is_active').eq('creator_id', creatorRow.id)
    const now = new Date()

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
        const rate = b.commission_rate ?? 0.10
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customersInWindow = (acqRows ?? []).filter((a: any) => a.is_active && new Date(a.expires_at) > now).length

    const { data: activityRows } = linkIds.length
      ? await db.from('attribution_events').select(`id, event_type, created_at, links ( businesses ( name ) ), bookings ( is_repeat, services ( name, price ) )`).in('link_id', linkIds).order('created_at', { ascending: false }).limit(50)
      : { data: [] }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentActivity: ActivityEvent[] = (activityRows ?? []).map((a: any) => {
      if (a.event_type === 'booking_confirmed' && a.bookings?.services) {
        const isRepeat = !!a.bookings.is_repeat
        return {
          id: a.id,
          type: 'booking' as const,
          bookingKind: isRepeat ? ('repeat' as const) : ('first' as const),
          label: `${isRepeat ? 'Repeat booking' : 'Booking'} · ${a.bookings.services.name}`,
          amount: calculateCreatorEarnings(a.bookings.services.price ?? 0),
          createdAt: a.created_at,
        }
      }
      return { id: a.id, type: 'click' as const, label: `Link click · ${a.links?.businesses?.name ?? 'Unknown'}`, createdAt: a.created_at }
    })

    const creator = rowToCreator(creatorRow, links.map((l) => l.business.slug))

    return {
      creator,
      totals: { totalClicks, totalBookings, totalEarnings, pendingPayout: totalEarnings, firstBookingEarnings, repeatEarnings, customersAcquired, customersInWindow, lifetimeValue },
      links,
      recentActivity,
    }
  },

  async getBookingsForDate(businessSlug: string, dateISO: string): Promise<AgendaBooking[]> {
    if (!isSupabaseConfigured()) return []
    const db = createServerClient()
    const { data: bizRow } = await db.from('businesses').select('id').eq('slug', businessSlug).single()
    if (!bizRow) return []

    const { data: rows } = await db
      .from('bookings')
      .select(`
        id, customer_name, customer_email, booking_date, booking_time, status, is_walkin, staff_id, is_repeat,
        services ( name, price, duration ),
        links ( creators ( slug, handle ) ),
        staff ( id, name ),
        customer_acquisitions!bookings_acquisition_id_fkey ( creators ( slug, handle ) )
      `)
      .eq('business_id', bizRow.id)
      .eq('booking_date', dateISO)
      .order('booking_time', { ascending: true })

    return (rows ?? []).map(mapAgendaBooking)
  },

  async listBusinessBookings(
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
        customer_acquisitions!bookings_acquisition_id_fkey ( creators ( slug, handle ) )
      `)
      .eq('business_id', bizRow.id)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false })
      .limit(opts?.limit ?? 100)

    if (opts?.status) query = query.eq('status', opts.status)

    const { data: rows } = await query
    return (rows ?? []).map(mapAgendaBooking)
  },

  /**
   * Whole-dataset aggregates for the per-creator stats page — totals for the stat
   * cards and per-video booking counts for the tile badges. Deliberately separate
   * from the paginated feed: a "12 bookings" count can't be derived from a 5-row
   * page. Loads minimal columns (no customer/creator joins) for this creator's
   * bookings only — far lighter than the old whole-business dashboard payload.
   */
  async getCreatorBookingStats(businessSlug: string, creatorSlug: string): Promise<CreatorBookingStats> {
    const empty: CreatorBookingStats = { bookingCount: 0, revenue: 0, commission: 0, repeats: 0, byVideo: {} }

    const accumulate = (rows: Array<{ status: string; isRepeat: boolean; commissionRate: number | null; contentId: string | null; price: number }>): CreatorBookingStats => {
      const stats: CreatorBookingStats = { bookingCount: 0, revenue: 0, commission: 0, repeats: 0, byVideo: {} }
      for (const r of rows) {
        if (r.status === 'cancelled') continue
        stats.bookingCount += 1
        stats.revenue += r.price
        stats.commission += Math.round(r.price * (r.commissionRate ?? 0))
        if (r.isRepeat) stats.repeats += 1
        if (r.contentId) {
          const v = stats.byVideo[r.contentId] ?? { bookingCount: 0, revenue: 0 }
          v.bookingCount += 1
          v.revenue += r.price
          stats.byVideo[r.contentId] = v
        }
      }
      return stats
    }

    if (!isSupabaseConfigured()) {
      return accumulate(
        mockCreatorBookings(businessSlug, creatorSlug).map((b) => ({
          status: b.status, isRepeat: b.isRepeat, commissionRate: b.commissionRate, contentId: b.contentId, price: b.price,
        })),
      )
    }

    const db = createServerClient()
    const scope = await resolveCreatorBookingScope(db, businessSlug, creatorSlug)
    if (!scope) return empty

    const { data: rows } = await db
      .from('bookings')
      .select('status, is_repeat, commission_rate, content_id, services ( price )')
      .eq('business_id', scope.businessId)
      .or(scope.orClause)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return accumulate((rows ?? []).map((r: any) => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      return { status: r.status, isRepeat: !!r.is_repeat, commissionRate: r.commission_rate ?? null, contentId: r.content_id ?? null, price: svc?.price ?? 0 }
    }))
  },

  /**
   * Paginated, filtered bookings feed for one creator at a business. Newest first.
   * Returns one extra row beyond `limit` internally to compute `hasMore` without a
   * second count query.
   */
  async listCreatorBookings(
    businessSlug: string,
    creatorSlug: string,
    opts: CreatorBookingFilters & { offset?: number; limit?: number },
  ): Promise<{ items: CreatorBookingFeedItem[]; hasMore: boolean }> {
    const offset = Math.max(0, opts.offset ?? 0)
    const limit = Math.min(50, Math.max(1, opts.limit ?? 5))

    if (!isSupabaseConfigured()) {
      let rows = mockCreatorBookings(businessSlug, creatorSlug)
      if (opts.status) rows = rows.filter((b) => b.status === opts.status)
      if (opts.type) rows = rows.filter((b) => (opts.type === 'repeat' ? b.isRepeat : !b.isRepeat))
      if (opts.videoId) rows = rows.filter((b) => b.contentId === opts.videoId)
      const page = rows.slice(offset, offset + limit + 1)
      const items = page.slice(0, limit).map((b) => ({
        id: b.id, serviceName: b.serviceName, price: b.price, customerName: b.customerName,
        date: b.date, time: b.time, status: b.status, isRepeat: b.isRepeat,
        commissionRate: b.commissionRate, contentId: b.contentId,
      }))
      return { items, hasMore: page.length > limit }
    }

    const db = createServerClient()
    const scope = await resolveCreatorBookingScope(db, businessSlug, creatorSlug)
    if (!scope) return { items: [], hasMore: false }

    let query = db
      .from('bookings')
      .select('id, customer_name, booking_date, booking_time, status, is_repeat, commission_rate, content_id, created_at, services ( name, price )')
      .eq('business_id', scope.businessId)
      .or(scope.orClause)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit) // +1 row to probe hasMore

    if (opts.status) query = query.eq('status', opts.status)
    if (opts.type) query = query.eq('is_repeat', opts.type === 'repeat')
    if (opts.videoId) query = query.eq('content_id', opts.videoId)
    const cutoff = rangeCutoff(opts.range)
    if (cutoff) query = query.gte('created_at', cutoff)

    const { data: rows } = await query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: CreatorBookingFeedItem[] = (rows ?? []).map((r: any) => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      return {
        id: r.id,
        serviceName: svc?.name ?? 'Service',
        price: svc?.price ?? 0,
        customerName: r.customer_name,
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        status: r.status,
        isRepeat: !!r.is_repeat,
        commissionRate: r.commission_rate ?? null,
        contentId: r.content_id ?? null,
      }
    })
    return { items: mapped.slice(0, limit), hasMore: mapped.length > limit }
  },

  async getBookingsForRange(businessSlug: string, startDate: string, endDate: string): Promise<AgendaBooking[]> {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows ?? []).map((r: any): AgendaBooking => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      const link = Array.isArray(r.links) ? r.links[0] : r.links
      const creatorRow = link ? (Array.isArray(link.creators) ? link.creators[0] : link.creators) : null
      const staffRow = Array.isArray(r.staff) ? r.staff[0] : r.staff
      const duration = svc?.duration ?? 60
      return {
        id: r.id,
        serviceName: svc?.name ?? 'Service',
        serviceDuration: duration,
        customerName: r.customer_name,
        customerEmail: r.customer_email ?? null,
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        endTime: formatEndTime(r.booking_time, duration),
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
  },

  async getStaffBookingsForDate(staffId: string, dateISO: string): Promise<AgendaBooking[]> {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows ?? []).map((r: any): AgendaBooking => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      const link = Array.isArray(r.links) ? r.links[0] : r.links
      const cre = link ? (Array.isArray(link.creators) ? link.creators[0] : link.creators) : null
      const duration = svc?.duration ?? 60
      return {
        id: r.id,
        serviceName: svc?.name ?? 'Service',
        serviceDuration: duration,
        customerName: r.customer_name,
        customerEmail: r.customer_email ?? null,
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        endTime: formatEndTime(r.booking_time, duration),
        status: r.status,
        isWalkin: !!r.is_walkin,
        price: svc?.price ?? 0,
        creator: cre ? { slug: cre.slug, handle: cre.handle } : null,
        staffId,
        staffName: null,
        isRepeat: false,
        acquiredBy: null,
      }
    })
  },

  async createWalkinBooking(data: {
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
        customer_contact: 'walk-in',
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
  },
}
