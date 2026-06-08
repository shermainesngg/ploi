import { createServerClient } from '@/lib/supabase'

/**
 * Data access for business locations (branches). One row per location; every
 * business has exactly one `is_primary` location (enforced by a partial unique
 * index in the DB).
 */
export const LocationRepo = {
  async listByBusinessId(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('locations')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true })
    return data ?? []
  },

  async findById(id: string) {
    const db = createServerClient()
    const { data } = await db
      .from('locations')
      .select('*')
      .eq('id', id)
      .single()
    return data
  },

  async findPrimaryByBusinessId(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('locations')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_primary', true)
      .maybeSingle()
    return data
  },

  async insert(data: Record<string, unknown>) {
    const db = createServerClient()
    const { data: row, error } = await db
      .from('locations')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  },

  async update(id: string, updates: Record<string, unknown>) {
    const db = createServerClient()
    const { error } = await db
      .from('locations')
      .update(updates)
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  /** Mirror the primary location for a business (used to keep it synced with
   *  the legacy business columns on Settings save). No-op if none exists. */
  async updatePrimaryByBusinessId(businessId: string, updates: Record<string, unknown>) {
    const db = createServerClient()
    const { error } = await db
      .from('locations')
      .update(updates)
      .eq('business_id', businessId)
      .eq('is_primary', true)
    if (error) throw new Error(error.message)
  },

  /** Soft-delete: locations are never hard-deleted because bookings reference them. */
  async deactivate(id: string) {
    const db = createServerClient()
    const { error } = await db
      .from('locations')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async countActiveByBusinessId(businessId: string): Promise<number> {
    const db = createServerClient()
    const { count } = await db
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true)
    return count ?? 0
  },
}
