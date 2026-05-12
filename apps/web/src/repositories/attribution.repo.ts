import { createServerClient } from '@/lib/supabase'

export interface ActiveAcquisition {
  id: string
  creatorId: string
  linkId: string | null
  customerPhone: string
  acquiredAt: string
  expiresAt: string
}

export const AttributionRepo = {
  async findActiveAcquisition(
    phone: string,
    businessId: string,
  ): Promise<ActiveAcquisition | null> {
    const db = createServerClient()
    const { data: row } = await db
      .from('customer_acquisitions')
      .select('id, creator_id, link_id, customer_phone, acquired_at, expires_at, is_active')
      .eq('customer_phone', phone)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .maybeSingle()
    if (!row) return null

    return {
      id: row.id,
      creatorId: row.creator_id,
      linkId: row.link_id,
      customerPhone: row.customer_phone,
      acquiredAt: row.acquired_at,
      expiresAt: row.expires_at,
    }
  },

  async markAcquisitionInactive(id: string) {
    const db = createServerClient()
    await db.from('customer_acquisitions').update({ is_active: false }).eq('id', id)
  },

  async insertAcquisition(data: {
    customer_phone: string
    customer_email: string | null
    customer_name: string
    business_id: string
    creator_id: string
    link_id: string
    first_booking_id: string
    expires_at: string
  }): Promise<string | null> {
    const db = createServerClient()
    const { data: row, error } = await db
      .from('customer_acquisitions')
      .insert(data)
      .select('id')
      .single()

    if (error) {
      // Race or duplicate — re-look-up the existing
      const { data: existing } = await db
        .from('customer_acquisitions')
        .select('id')
        .eq('customer_phone', data.customer_phone)
        .eq('business_id', data.business_id)
        .maybeSingle()
      return existing?.id ?? null
    }

    return row.id
  },

  async insertEvent(data: {
    link_id: string
    booking_id?: string
    event_type: string
  }) {
    const db = createServerClient()
    await db.from('attribution_events').insert(data)
  },
}
