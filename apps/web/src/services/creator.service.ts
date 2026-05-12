import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  businesses as seedBusinesses,
  creators as seedCreators,
  links as seedLinks,
} from '@/lib/seed-data'
import { rowToBusiness, rowToCreator, rowToLink } from '@/lib/mappers'
import type { Business, Link, Social, SocialPlatform } from '@/lib/types'

export interface CreatorBusinessLink {
  business: Business
  link: Link
}

export const CreatorService = {
  async getProfile(creatorSlug: string): Promise<{
    creator: ReturnType<typeof rowToCreator> | null
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

    const { data: linkRows } = await db
      .from('links')
      .select('*')
      .eq('creator_id', creatorRow.id)
      .eq('status', 'active')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  },

  async create(data: {
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
  },
}
