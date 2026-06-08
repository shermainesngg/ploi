import { createServerClient } from '@/lib/supabase'

export const BusinessRepo = {
  async findBySlug(slug: string) {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('*, services(*), locations(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    return data
  },

  async findIdBySlug(slug: string): Promise<string | null> {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .single()
    return data?.id ?? null
  },

  async findBySlugWithStripe(slug: string) {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('id, slug, name, stripe_account_id')
      .eq('slug', slug)
      .single()
    return data
  },

  async updateBySlug(slug: string, updates: Record<string, unknown>) {
    const db = createServerClient()
    const { error } = await db
      .from('businesses')
      .update(updates)
      .eq('slug', slug)
    if (error) throw new Error(error.message)
  },

  async findServiceById(serviceId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('services')
      .select('id, name, price, duration, buffer_minutes')
      .eq('id', serviceId)
      .single()
    return data
  },

  async findBusinessById(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('id, slug, name, stripe_account_id')
      .eq('id', businessId)
      .single()
    return data
  },
}
