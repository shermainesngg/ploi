import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  businesses as seedBusinesses,
  creators as seedCreators,
  links as seedLinks,
} from '@/lib/seed-data'
import { rowToBusiness, rowToCreator, rowToLink } from '@/lib/mappers'
import type { Business, Creator, Link, Social, SocialPlatform } from '@/lib/types'

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

  // Site-wide creator search — matches display name, handle, or slug.
  async search(query: string): Promise<Creator[]> {
    if (!isSupabaseConfigured()) {
      const q = query.toLowerCase()
      return Object.values(seedCreators).filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          c.slug.includes(q),
      )
    }
    const db = createServerClient()
    const { data } = await db
      .from('creators')
      .select('*')
      .eq('is_active', true)
      .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%,slug.ilike.%${query}%`)
      .limit(10)
    // Search results don't need linked businesses — pass an empty list.
    return (data ?? []).map((r) => rowToCreator(r, []))
  },

  async create(data: {
    slug: string
    handle: string
    displayName: string
    bio: string
    email?: string
    authUserId?: string
    socials?: Social[]
  }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add env vars to .env.local to save data.')
    }

    const db = createServerClient()

    // Slugs are shared across the /[slug] namespace — a creator can't claim a
    // slug already taken by a business.
    const { data: bizClash } = await db
      .from('businesses')
      .select('id')
      .eq('slug', data.slug)
      .maybeSingle()
    if (bizClash) {
      throw new Error('That handle is already taken by a business on PLOI. Please choose a different handle.')
    }

    // Business identities are exclusive — an account or email that belongs to
    // a business can never also join as a creator.
    if (data.authUserId) {
      const { data: bizByUser } = await db
        .from('businesses')
        .select('id')
        .eq('auth_user_id', data.authUserId)
        .maybeSingle()
      if (bizByUser) {
        throw new Error('A business account can’t also join as a creator. Use a separate account for creator activity.')
      }
    }
    if (data.email) {
      const { data: bizByEmail } = await db
        .from('businesses')
        .select('id')
        .eq('email', data.email)
        .maybeSingle()
      if (bizByEmail) {
        throw new Error('That email already belongs to a business on PLOI. Use a different email for creator activity.')
      }
    }

    const { data: creator, error } = await db
      .from('creators')
      .insert({
        slug: data.slug,
        handle: data.handle,
        display_name: data.displayName,
        bio: data.bio,
        email: data.email ?? null,
        auth_user_id: data.authUserId ?? null,
        socials: data.socials ?? [],
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { slug: creator.slug, id: creator.id }
  },
}
