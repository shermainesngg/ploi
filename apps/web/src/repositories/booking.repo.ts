import { createServerClient } from '@/lib/supabase'

export interface BookingInsert {
  service_id: string
  business_id: string
  location_id: string | null
  link_id: string | null
  content_id: string | null
  staff_id: string | null
  customer_name: string
  customer_contact: string
  customer_email: string | null
  customer_phone: string | null
  booking_date: string
  booking_time: string
  status: string
  payment_status: string | null
  is_walkin: boolean
  acquisition_id: string | null
  is_repeat: boolean
  commission_rate: number | null
}

export const BookingRepo = {
  async insert(data: Partial<BookingInsert>) {
    const db = createServerClient()
    const { data: row, error } = await db
      .from('bookings')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  },

  async findById(id: string) {
    const db = createServerClient()
    const { data, error } = await db
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  /** Booking + the related rows needed to compose notification emails. */
  async findForNotification(id: string) {
    const db = createServerClient()
    const { data, error } = await db
      .from('bookings')
      .select(`
        id, customer_name, customer_email, booking_date, booking_time,
        status, payment_status, is_walkin,
        reschedule_proposed_date, reschedule_proposed_time, reschedule_token,
        services ( name, price ),
        businesses ( name, slug, email, location ),
        locations ( name, address )
      `)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  },

  async updateStatus(id: string, status: string) {
    const db = createServerClient()
    const { error } = await db
      .from('bookings')
      .update({ status })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async updatePaymentStatus(id: string, updates: Record<string, unknown>) {
    const db = createServerClient()
    const { error } = await db
      .from('bookings')
      .update(updates)
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async updateStripeSession(id: string, sessionId: string) {
    const db = createServerClient()
    const { error } = await db
      .from('bookings')
      .update({ stripe_session_id: sessionId })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async findLinkIdById(id: string): Promise<string | null> {
    const db = createServerClient()
    const { data } = await db
      .from('bookings')
      .select('link_id')
      .eq('id', id)
      .single()
    return data?.link_id ?? null
  },

  async updateAcquisitionId(bookingId: string, acquisitionId: string) {
    const db = createServerClient()
    const { error } = await db
      .from('bookings')
      .update({ acquisition_id: acquisitionId })
      .eq('id', bookingId)
    if (error) throw new Error(error.message)
  },

  // ── Google Calendar sync ────────────────────────────────────────────────────

  /** Booking + the related rows needed to compose a Google Calendar event. */
  async findForCalendarSync(id: string) {
    const db = createServerClient()
    const { data, error } = await db
      .from('bookings')
      .select(`
        id, customer_name, customer_phone, booking_date, booking_time,
        status, google_event_id, business_id,
        services ( name, duration ),
        businesses ( slug )
      `)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  },

  /** Persist the Google event id + sync status after a push (or a failure). */
  async setGoogleSync(
    id: string,
    updates: {
      google_event_id?: string | null
      google_sync_status: 'pending' | 'synced' | 'failed' | null
      google_synced_at?: string | null
    },
  ) {
    const db = createServerClient()
    const { error } = await db
      .from('bookings')
      .update(updates)
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  /** Future confirmed bookings that haven't synced (null or failed) — for Re-sync. */
  async findPendingSyncForBusiness(businessId: string) {
    const db = createServerClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await db
      .from('bookings')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'confirmed')
      .gte('booking_date', today)
      .or('google_sync_status.is.null,google_sync_status.eq.failed')
    if (error) throw new Error(error.message)
    return data ?? []
  },
}
