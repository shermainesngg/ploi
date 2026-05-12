import { createServerClient } from '@/lib/supabase'

export const LinkRepo = {
  async findCreatorIdByLinkId(linkId: string): Promise<string | null> {
    const db = createServerClient()
    const { data } = await db
      .from('links')
      .select('creator_id')
      .eq('id', linkId)
      .maybeSingle()
    return data?.creator_id ?? null
  },

  async findByShortCode(shortCode: string) {
    const db = createServerClient()
    const { data } = await db
      .from('links')
      .select('id, status, click_count')
      .eq('short_code', shortCode)
      .single()
    return data
  },

  async incrementClickCount(linkId: string, currentCount: number) {
    const db = createServerClient()
    await db
      .from('links')
      .update({ click_count: currentCount + 1 })
      .eq('id', linkId)
  },
}
