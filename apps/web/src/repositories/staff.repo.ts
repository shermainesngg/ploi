import { createServerClient } from '@/lib/supabase'

export interface StaffScheduleRow {
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

export const StaffRepo = {
  async listByBusinessId(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('staff')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    return data ?? []
  },

  async findById(staffId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single()
    return data
  },

  async insert(data: {
    business_id: string
    location_id?: string | null
    name: string
    role: string | null
    photo_url: string | null
  }) {
    const db = createServerClient()
    const { data: row, error } = await db
      .from('staff')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  },

  async update(staffId: string, data: Record<string, unknown>) {
    const db = createServerClient()
    const { error } = await db
      .from('staff')
      .update(data)
      .eq('id', staffId)
    if (error) throw new Error(error.message)
  },

  async deactivate(staffId: string) {
    const db = createServerClient()
    const { error } = await db
      .from('staff')
      .update({ is_active: false })
      .eq('id', staffId)
    if (error) throw new Error(error.message)
  },

  async listServiceIds(staffIds: string[]): Promise<Map<string, string[]>> {
    if (staffIds.length === 0) return new Map()
    const db = createServerClient()
    const { data } = await db
      .from('staff_services')
      .select('staff_id, service_id')
      .in('staff_id', staffIds)
    const map = new Map<string, string[]>()
    for (const row of data ?? []) {
      const cur = map.get(row.staff_id) ?? []
      cur.push(row.service_id)
      map.set(row.staff_id, cur)
    }
    return map
  },

  async replaceServiceIds(staffId: string, serviceIds: string[]) {
    const db = createServerClient()
    await db.from('staff_services').delete().eq('staff_id', staffId)
    if (serviceIds.length > 0) {
      const rows = serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid }))
      const { error } = await db.from('staff_services').insert(rows)
      if (error) throw new Error(error.message)
    }
  },

  async insertServiceIds(staffId: string, serviceIds: string[]) {
    if (serviceIds.length === 0) return
    const db = createServerClient()
    const rows = serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid }))
    const { error } = await db.from('staff_services').insert(rows)
    if (error) throw new Error(error.message)
  },

  async getSchedule(staffId: string): Promise<StaffScheduleRow[]> {
    const db = createServerClient()
    const { data } = await db
      .from('staff_schedules')
      .select('day_of_week, start_time, end_time, is_available')
      .eq('staff_id', staffId)
      .order('day_of_week', { ascending: true })
    return (data ?? []) as StaffScheduleRow[]
  },

  async replaceSchedule(staffId: string, rows: Array<{
    staff_id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_available: boolean
  }>) {
    const db = createServerClient()
    await db.from('staff_schedules').delete().eq('staff_id', staffId)
    if (rows.length === 0) return
    const { error } = await db.from('staff_schedules').insert(rows)
    if (error) throw new Error(error.message)
  },

  async listBlocks(staffId: string) {
    const db = createServerClient()
    const today = new Date().toISOString().split('T')[0]
    const { data } = await db
      .from('time_blocks')
      .select('id, staff_id, block_date, start_time, end_time, reason')
      .eq('staff_id', staffId)
      .gte('block_date', today)
      .order('block_date', { ascending: true })
    return data ?? []
  },

  async insertBlock(data: {
    business_id: string
    staff_id: string
    block_date: string
    start_time: string
    end_time: string
    reason: string | null
  }) {
    const db = createServerClient()
    const { data: row, error } = await db
      .from('time_blocks')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row
  },

  async deleteBlock(blockId: string) {
    const db = createServerClient()
    const { error } = await db
      .from('time_blocks')
      .delete()
      .eq('id', blockId)
    if (error) throw new Error(error.message)
  },

  async findBusinessIdByStaffId(staffId: string): Promise<string | null> {
    const db = createServerClient()
    const { data } = await db
      .from('staff')
      .select('business_id')
      .eq('id', staffId)
      .single()
    return data?.business_id ?? null
  },

  async listActiveByBusinessId(businessId: string, locationId?: string | null) {
    const db = createServerClient()
    let q = db
      .from('staff')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true)
    // Scope to a branch when given, so a multi-location business never
    // auto-assigns a staff member who works at a different branch.
    if (locationId) q = q.eq('location_id', locationId)
    const { data } = await q
    return data ?? []
  },

  async listEligibleForService(serviceId: string, staffIds: string[]) {
    if (staffIds.length === 0) return []
    const db = createServerClient()
    const { data } = await db
      .from('staff_services')
      .select('staff_id')
      .eq('service_id', serviceId)
      .in('staff_id', staffIds)
    return (data ?? []).map((r) => r.staff_id)
  },

  async listBookingsForStaffOnDate(staffIds: string[], dateISO: string) {
    if (staffIds.length === 0) return []
    const db = createServerClient()
    const { data } = await db
      .from('bookings')
      .select('id, staff_id, booking_time, services(duration, buffer_minutes)')
      .in('staff_id', staffIds)
      .eq('booking_date', dateISO)
      .in('status', ['pending', 'confirmed'])
    return data ?? []
  },

  /** Business-wide closures (time_blocks with no staff_id) on a date/weekday. */
  async listBusinessWideBlocks(businessId: string, dateISO: string, dow: number) {
    const db = createServerClient()
    const { data } = await db
      .from('time_blocks')
      .select('start_time, end_time')
      .eq('business_id', businessId)
      .is('staff_id', null)
      .or(`block_date.eq.${dateISO},recurring_dow.eq.${dow}`)
    return data ?? []
  },

  async listSchedulesForStaffOnDow(staffIds: string[], dow: number) {
    if (staffIds.length === 0) return []
    const db = createServerClient()
    const { data } = await db
      .from('staff_schedules')
      .select('staff_id, day_of_week, start_time, end_time, is_available')
      .in('staff_id', staffIds)
      .eq('day_of_week', dow)
    return data ?? []
  },

  async listBlocksForStaff(staffIds: string[], dateISO: string, dow: number) {
    if (staffIds.length === 0) return []
    const db = createServerClient()
    const { data } = await db
      .from('time_blocks')
      .select('staff_id, block_date, recurring_dow, start_time, end_time')
      .in('staff_id', staffIds)
      .or(`block_date.eq.${dateISO},recurring_dow.eq.${dow}`)
    return data ?? []
  },

  async listStaffBookingsForDate(staffId: string, dateISO: string) {
    const db = createServerClient()
    const { data } = await db
      .from('bookings')
      .select(`
        id, customer_name, customer_email, booking_date, booking_time, status, is_walkin,
        services ( name, price, duration ),
        links ( creators ( slug, handle ) )
      `)
      .eq('staff_id', staffId)
      .eq('booking_date', dateISO)
      .order('booking_time', { ascending: true })
    return data ?? []
  },
}
