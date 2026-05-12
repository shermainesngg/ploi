import { createServerClient } from '@/lib/supabase'
import type { SocialPlatform } from '@/lib/types'

export const CreatorRepo = {
  async findBySlug(slug: string) {
    const db = createServerClient()
    const { data } = await db
      .from('creators')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    return data
  },

  async findIdBySlug(slug: string): Promise<string | null> {
    const db = createServerClient()
    const { data } = await db
      .from('creators')
      .select('id')
      .eq('slug', slug)
      .single()
    return data?.id ?? null
  },

  async insert(data: {
    slug: string
    handle: string
    display_name: string
    bio: string
    email: string | null
    socials: Array<{ platform: SocialPlatform; url: string }>
  }) {
    const db = createServerClient()
    const { data: row, error } = await db
      .from('creators')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  },
}
