import { createServerClient } from '@/lib/supabase'

export interface BookingInsert {
  service_id: string
  business_id: string
  link_id: string | null
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
        services ( name, price ),
        businesses ( name, slug, email, location )
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
}
