import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isProposalLive } from '@/lib/reschedule'
import { calculateCreatorEarnings } from '@/lib/constants'
import type { AppUser } from '@/lib/auth'

/**
 * In-app notification feed — derived live from bookings (no notifications table).
 *
 * Each booking-related event the user already gets an email about (new request,
 * confirm/decline, cancellation, reschedule proposal, attributed booking) is
 * surfaced here as a `FeedItem`. Read/unread is NOT stored server-side: the
 * client compares each item's `createdAt` against a locally-stored "last seen"
 * timestamp. So this service is purely a read model — stateless and idempotent.
 */

export type FeedTone = 'default' | 'success' | 'warning' | 'danger'

export interface FeedItem {
  /** Stable across refetches so the client can dedupe/track: `${source}:${bookingId}`. */
  id: string
  title: string
  body: string
  href: string
  /** ISO timestamp used for sort + unread comparison. */
  createdAt: string
  tone: FeedTone
  /** True when the item needs the user to do something (e.g. respond to a proposal). */
  actionable?: boolean
}

/** Cap per source and overall — the dropdown shows a recent window, not history. */
const PER_SOURCE_LIMIT = 20
const TOTAL_LIMIT = 30

/** Supabase embeds come back as a single object or a 1-element array. */
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function formatTime(time: string): string {
  return String(time).slice(0, 5)
}

function when(date: string, time: string): string {
  return `${formatDate(date)} · ${formatTime(time)}`
}

/**
 * Business owner feed: things at their business that need attention — new
 * booking requests and customer cancellations. (Confirmations are the owner's
 * own action, so they're intentionally omitted as noise.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function businessFeed(db: any, businessSlug: string): Promise<FeedItem[]> {
  const { data: biz } = await db.from('businesses').select('id, slug').eq('slug', businessSlug).maybeSingle()
  if (!biz) return []

  const { data: rows } = await db
    .from('bookings')
    .select('id, customer_name, booking_date, booking_time, status, created_at, services ( name )')
    .eq('business_id', biz.id)
    .in('status', ['pending', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(PER_SOURCE_LIMIT)

  const items: FeedItem[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rows ?? []) as any[]) {
    if (!r.created_at) continue
    const service = one<{ name: string }>(r.services)?.name ?? 'a service'
    const slot = when(r.booking_date, r.booking_time)
    if (r.status === 'pending') {
      items.push({
        id: `biz-request:${r.id}`,
        title: 'New booking request',
        body: `${r.customer_name} · ${service} · ${slot}`,
        href: `/dashboard/business/${biz.slug}?tab=bookings&status=pending`,
        createdAt: r.created_at,
        tone: 'warning',
        actionable: true,
      })
    } else {
      items.push({
        id: `biz-cancelled:${r.id}`,
        title: 'Booking cancelled',
        body: `${r.customer_name} cancelled ${service} · ${slot}`,
        href: `/dashboard/business/${biz.slug}?tab=calendar`,
        createdAt: r.created_at,
        tone: 'danger',
      })
    }
  }
  return items
}

/**
 * Customer feed (keyed on the auth email): status changes the business made to
 * their bookings, plus any live business-proposed reschedule awaiting a reply.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function customerFeed(db: any, email: string): Promise<FeedItem[]> {
  const { data: rows } = await db
    .from('bookings')
    .select(`
      id, booking_date, booking_time, status, created_at,
      reschedule_proposed_date, reschedule_proposed_time, reschedule_proposed_at, reschedule_token,
      services ( name ),
      businesses ( name )
    `)
    .eq('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(PER_SOURCE_LIMIT)

  const items: FeedItem[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rows ?? []) as any[]) {
    if (!r.created_at) continue
    const service = one<{ name: string }>(r.services)?.name ?? 'your booking'
    const business = one<{ name: string }>(r.businesses)?.name ?? 'The business'
    const slot = when(r.booking_date, r.booking_time)

    // A live reschedule proposal takes priority over the underlying pending state.
    if (isProposalLive(r) && r.reschedule_token) {
      items.push({
        id: `cust-reschedule:${r.id}`,
        title: `${business} proposed a new time`,
        body: `${service} · new time ${when(r.reschedule_proposed_date, r.reschedule_proposed_time)}`,
        href: `/booking/${r.id}/reschedule?token=${encodeURIComponent(r.reschedule_token)}`,
        createdAt: r.reschedule_proposed_at ?? r.created_at,
        tone: 'warning',
        actionable: true,
      })
      continue
    }

    if (r.status === 'confirmed') {
      items.push({
        id: `cust-confirmed:${r.id}`,
        title: 'Booking confirmed',
        body: `${business} confirmed ${service} · ${slot}`,
        href: '/bookings',
        createdAt: r.created_at,
        tone: 'success',
      })
    } else if (r.status === 'declined') {
      items.push({
        id: `cust-declined:${r.id}`,
        title: 'Booking declined',
        body: `${business} couldn't take ${service} · ${slot}`,
        href: '/bookings',
        createdAt: r.created_at,
        tone: 'danger',
      })
    } else if (r.status === 'cancelled') {
      items.push({
        id: `cust-cancelled:${r.id}`,
        title: 'Booking cancelled',
        body: `${business} cancelled ${service} · ${slot}`,
        href: '/bookings',
        createdAt: r.created_at,
        tone: 'danger',
      })
    }
  }
  return items
}

/**
 * Creator feed: confirmed bookings attributed to their links, with earnings —
 * read off `attribution_events`, the same source the creator dashboard uses.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function creatorFeed(db: any, creatorSlug: string): Promise<FeedItem[]> {
  const { data: creator } = await db.from('creators').select('id, slug').eq('slug', creatorSlug).maybeSingle()
  if (!creator) return []

  const { data: linkRows } = await db.from('links').select('id').eq('creator_id', creator.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkIds = (linkRows ?? []).map((l: any) => l.id)
  if (!linkIds.length) return []

  const { data: rows } = await db
    .from('attribution_events')
    .select('id, event_type, created_at, bookings ( is_repeat, services ( name, price ) )')
    .in('link_id', linkIds)
    .eq('event_type', 'booking_confirmed')
    .order('created_at', { ascending: false })
    .limit(PER_SOURCE_LIMIT)

  const items: FeedItem[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of (rows ?? []) as any[]) {
    if (!a.created_at) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = one<{ is_repeat: boolean; services: any }>(a.bookings)
    const service = one<{ name: string; price: number }>(booking?.services)
    if (!service) continue
    const isRepeat = !!booking?.is_repeat
    const earned = calculateCreatorEarnings(service.price ?? 0)
    items.push({
      id: `creator-booking:${a.id}`,
      title: isRepeat ? 'Repeat booking via your link' : 'New booking via your link',
      body: `${service.name} · earned ฿${earned.toLocaleString()}`,
      href: `/dashboard/creator/${creator.slug}`,
      createdAt: a.created_at,
      tone: 'success',
    })
  }
  return items
}

export const NotificationFeedService = {
  /**
   * Build the merged, newest-first feed for whatever roles the user owns. A user
   * is at most one of business/creator (business is an exclusive identity), but
   * the customer feed runs for everyone — a creator can still book as a customer.
   */
  async listForUser(user: AppUser): Promise<FeedItem[]> {
    if (!isSupabaseConfigured()) return []
    const db = createServerClient()

    const sources: Promise<FeedItem[]>[] = [customerFeed(db, user.email)]
    if (user.businessSlug) sources.push(businessFeed(db, user.businessSlug))
    if (user.creatorSlug) sources.push(creatorFeed(db, user.creatorSlug))

    const results = await Promise.all(sources)
    return results
      .flat()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, TOTAL_LIMIT)
  },
}
