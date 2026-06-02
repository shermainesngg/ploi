import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  creators as seedCreators,
  links as seedLinks,
} from '@/lib/seed-data'
import { rowToCreator, rowToLink } from '@/lib/mappers'
import type { Creator, Link, LinkStatus, SocialPlatform } from '@/lib/types'

export interface PendingLinkRequest {
  link: Link
  creator: Creator
}

export interface MyCreatorEntry {
  creator: Creator
  link: Link
  bookingCount: number
  revenue: number
}

export const LinkService = {
  async create(opts: {
    creatorId: string
    businessId: string
    shortCode: string
    contentUrl?: string
    platform?: SocialPlatform
    contentThumbnailUrl?: string
    featuredServiceIds?: string[]
  }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.')
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
        featured_service_ids: opts.featuredServiceIds ?? [],
        // Keep the legacy single column in sync (first featured service) for
        // backward compatibility with anything still reading it.
        featured_service_id: opts.featuredServiceIds?.[0] ?? null,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  async updateStatus(linkId: string, status: LinkStatus) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.')
    const db = createServerClient()
    const { error } = await db
      .from('links')
      .update({ status })
      .eq('id', linkId)
    if (error) throw new Error(error.message)
  },

  async recordClick(creatorSlug: string, businessSlug: string) {
    if (!isSupabaseConfigured()) return
    const db = createServerClient()

    const { data: linkRow } = await db
      .from('links')
      .select('id, status, click_count')
      .eq('short_code', `${creatorSlug}/${businessSlug}`)
      .single()

    if (!linkRow || linkRow.status !== 'active') return

    await Promise.all([
      db.from('links').update({ click_count: (linkRow.click_count ?? 0) + 1 }).eq('id', linkRow.id),
      db.from('attribution_events').insert({ link_id: linkRow.id, event_type: 'click' }),
    ])
  },

  async getPendingRequests(businessSlug: string): Promise<PendingLinkRequest[]> {
    if (!isSupabaseConfigured()) return []

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
  },

  async getMyCreators(businessSlug: string): Promise<MyCreatorEntry[]> {
    if (!isSupabaseConfigured()) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  },
}
