import { isSupabaseConfigured } from '@/lib/supabase'
import { LocationRepo } from '@/repositories/location.repo'
import { BusinessRepo } from '@/repositories/business.repo'
import { rowToLocation } from '@/lib/mappers'
import type { Location } from '@/lib/types'
import type { CreateLocationInput, UpdateLocationInput } from '@/validation/location.schema'

/** Trim a string field to null when empty, leave undefined untouched. */
function cleanOptional(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined
  const t = v.trim()
  return t.length > 0 ? t : null
}

export const LocationService = {
  async list(businessSlug: string): Promise<Location[]> {
    if (!isSupabaseConfigured()) return []
    const businessId = await BusinessRepo.findIdBySlug(businessSlug)
    if (!businessId) return []
    const rows = await LocationRepo.listByBusinessId(businessId)
    return rows.map(rowToLocation)
  },

  async getById(id: string): Promise<Location | null> {
    if (!isSupabaseConfigured()) return null
    const row = await LocationRepo.findById(id)
    return row ? rowToLocation(row) : null
  },

  /**
   * Add a new branch to a business. The first location created for a business
   * becomes its primary; subsequent ones are secondary branches.
   */
  async create(businessSlug: string, data: CreateLocationInput): Promise<Location> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const businessId = await BusinessRepo.findIdBySlug(businessSlug)
    if (!businessId) throw new Error('Business not found')

    const existing = await LocationRepo.countActiveByBusinessId(businessId)
    const photos = (data.photos ?? []).filter((p) => p.trim().length > 0)

    const row = await LocationRepo.insert({
      business_id: businessId,
      name: cleanOptional(data.name) ?? null,
      address: data.address.trim(),
      opening_hours: data.openingHours ?? null,
      contact_phone: cleanOptional(data.contactPhone) ?? null,
      contact_whatsapp: cleanOptional(data.contactWhatsapp) ?? null,
      contact_line: cleanOptional(data.contactLine) ?? null,
      photos,
      is_primary: existing === 0,
      sort_order: existing,
    })
    return rowToLocation(row)
  },

  async update(id: string, data: UpdateLocationInput): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = cleanOptional(data.name) ?? null
    if (data.address !== undefined) updates.address = data.address.trim()
    if (data.openingHours !== undefined) updates.opening_hours = data.openingHours ?? null
    if (data.contactPhone !== undefined) updates.contact_phone = cleanOptional(data.contactPhone) ?? null
    if (data.contactWhatsapp !== undefined) updates.contact_whatsapp = cleanOptional(data.contactWhatsapp) ?? null
    if (data.contactLine !== undefined) updates.contact_line = cleanOptional(data.contactLine) ?? null
    if (data.photos !== undefined) updates.photos = data.photos.filter((p) => p.trim().length > 0)
    if (data.isActive !== undefined) updates.is_active = data.isActive

    if (Object.keys(updates).length > 0) {
      await LocationRepo.update(id, updates)
    }
  },

  /**
   * Remove a branch (soft delete — bookings still reference it). The primary
   * location can't be removed; the owner must promote another branch first.
   */
  async remove(id: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const row = await LocationRepo.findById(id)
    if (!row) throw new Error('Location not found')
    if (row.is_primary) {
      throw new Error('Cannot remove the primary location. Set another branch as primary first.')
    }
    await LocationRepo.deactivate(id)
  },
}
