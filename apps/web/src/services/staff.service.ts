import { isSupabaseConfigured } from '@/lib/supabase'
import { StaffRepo } from '@/repositories/staff.repo'
import { BusinessRepo } from '@/repositories/business.repo'

export interface StaffMember {
  id: string
  businessId: string
  name: string
  role: string | null
  photoUrl: string | null
  isActive: boolean
  serviceIds: string[]
}

export interface StaffScheduleEntry {
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

export interface StaffBlock {
  id: string
  staffId: string
  blockDate: string
  startTime: string
  endTime: string
  reason: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStaff(r: any, serviceIds: string[]): StaffMember {
  return {
    id: r.id,
    businessId: r.business_id,
    name: r.name,
    role: r.role ?? null,
    photoUrl: r.photo_url ?? null,
    isActive: r.is_active ?? true,
    serviceIds,
  }
}

export const StaffService = {
  async list(businessSlug: string): Promise<StaffMember[]> {
    if (!isSupabaseConfigured()) return []
    const businessId = await BusinessRepo.findIdBySlug(businessSlug)
    if (!businessId) return []

    const staffRows = await StaffRepo.listByBusinessId(businessId)
    const staffIds = staffRows.map((s: { id: string }) => s.id)
    const servicesByStaff = await StaffRepo.listServiceIds(staffIds)

    return staffRows.map((r: { id: string }) =>
      rowToStaff(r, servicesByStaff.get(r.id) ?? []),
    )
  },

  async getForService(businessSlug: string, serviceId: string): Promise<StaffMember[]> {
    const all = await this.list(businessSlug)
    return all.filter((s) => s.serviceIds.includes(serviceId))
  },

  async getById(staffId: string): Promise<StaffMember | null> {
    if (!isSupabaseConfigured()) return null
    const row = await StaffRepo.findById(staffId)
    if (!row) return null
    const serviceMap = await StaffRepo.listServiceIds([staffId])
    return rowToStaff(row, serviceMap.get(staffId) ?? [])
  },

  async create(
    businessSlug: string,
    data: { name: string; role?: string; photoUrl?: string; serviceIds: string[] },
  ): Promise<StaffMember> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const businessId = await BusinessRepo.findIdBySlug(businessSlug)
    if (!businessId) throw new Error('Business not found')

    const row = await StaffRepo.insert({
      business_id: businessId,
      name: data.name,
      role: data.role ?? null,
      photo_url: data.photoUrl ?? null,
    })

    if (data.serviceIds.length > 0) {
      await StaffRepo.insertServiceIds(row.id, data.serviceIds)
    }

    return rowToStaff(row, data.serviceIds)
  },

  async update(
    staffId: string,
    data: { name?: string; role?: string; photoUrl?: string; serviceIds?: string[] },
  ) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

    const update: Record<string, unknown> = {}
    if (data.name !== undefined) update.name = data.name
    if (data.role !== undefined) update.role = data.role || null
    if (data.photoUrl !== undefined) update.photo_url = data.photoUrl || null
    if (Object.keys(update).length > 0) {
      await StaffRepo.update(staffId, update)
    }

    if (data.serviceIds) {
      await StaffRepo.replaceServiceIds(staffId, data.serviceIds)
    }
  },

  async deactivate(staffId: string) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    await StaffRepo.deactivate(staffId)
  },

  async getSchedule(staffId: string): Promise<StaffScheduleEntry[]> {
    if (!isSupabaseConfigured()) return []
    const rows = await StaffRepo.getSchedule(staffId)
    return rows.map((r) => ({
      dayOfWeek: r.day_of_week,
      startTime: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
      isAvailable: r.is_available,
    }))
  },

  async setSchedule(staffId: string, schedule: StaffScheduleEntry[]): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const rows = schedule.map((s) => ({
      staff_id: staffId,
      day_of_week: s.dayOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
      is_available: s.isAvailable,
    }))
    await StaffRepo.replaceSchedule(staffId, rows)
  },

  async listBlocks(staffId: string): Promise<StaffBlock[]> {
    if (!isSupabaseConfigured()) return []
    const rows = await StaffRepo.listBlocks(staffId)
    return rows.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        id: r.id,
        staffId: r.staff_id,
        blockDate: r.block_date,
        startTime: String(r.start_time).slice(0, 5),
        endTime: String(r.end_time).slice(0, 5),
        reason: r.reason ?? null,
      }),
    )
  },

  async createBlock(
    staffId: string,
    data: { blockDate: string; startTime?: string; endTime?: string; reason?: string },
  ): Promise<StaffBlock> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const businessId = await StaffRepo.findBusinessIdByStaffId(staffId)
    if (!businessId) throw new Error('Staff not found')

    const row = await StaffRepo.insertBlock({
      business_id: businessId,
      staff_id: staffId,
      block_date: data.blockDate,
      start_time: data.startTime ?? '00:00',
      end_time: data.endTime ?? '23:59',
      reason: data.reason ?? null,
    })

    return {
      id: row.id,
      staffId,
      blockDate: row.block_date,
      startTime: String(row.start_time).slice(0, 5),
      endTime: String(row.end_time).slice(0, 5),
      reason: row.reason,
    }
  },

  async deleteBlock(blockId: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    await StaffRepo.deleteBlock(blockId)
  },

  async pickEligibleStaff(opts: {
    businessId: string
    serviceId: string
    bookingDate: string
    bookingTime: string
  }): Promise<string | null> {
    if (!isSupabaseConfigured()) return null

    const { data: svc } = await (await import('@/lib/supabase')).createServerClient()
      .from('services')
      .select('duration, buffer_minutes')
      .eq('id', opts.serviceId)
      .single()
    const duration = (svc?.duration ?? 60) + (svc?.buffer_minutes ?? 0)

    const allStaff = await StaffRepo.listActiveByBusinessId(opts.businessId)
    const allStaffIds = allStaff.map((s) => s.id)
    if (allStaffIds.length === 0) return null

    const eligibleIds = await StaffRepo.listEligibleForService(opts.serviceId, allStaffIds)
    if (eligibleIds.length === 0) return null

    const date = new Date(`${opts.bookingDate}T00:00:00`)
    const dow = date.getDay()
    const [bh, bm] = opts.bookingTime.split(':').map(Number)
    const startMin = bh * 60 + (bm || 0)
    const endMin = startMin + duration

    const [bookings, schedules, blocks] = await Promise.all([
      StaffRepo.listBookingsForStaffOnDate(eligibleIds, opts.bookingDate),
      StaffRepo.listSchedulesForStaffOnDow(eligibleIds, dow),
      StaffRepo.listBlocksForStaff(eligibleIds, opts.bookingDate, dow),
    ])

    function timeToMin(t: string) {
      const [h, m] = String(t).slice(0, 5).split(':').map(Number)
      return h * 60 + (m || 0)
    }

    for (const staffId of eligibleIds) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const todays = (schedules ?? []).filter((s: any) => s.staff_id === staffId && s.day_of_week === dow)
      if (todays.length > 0) {
        const sched = todays[0]
        if (!sched.is_available) continue
        if (startMin < timeToMin(sched.start_time) || endMin > timeToMin(sched.end_time)) continue
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myBookings = (bookings ?? []).filter((b: any) => b.staff_id === staffId)
      const hasConflict = myBookings.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (b: any) => {
          const sv = Array.isArray(b.services) ? b.services[0] : b.services
          const bStart = timeToMin(b.booking_time)
          const bEnd = bStart + (sv?.duration ?? 60) + (sv?.buffer_minutes ?? 0)
          return startMin < bEnd && bStart < endMin
        },
      )
      if (hasConflict) continue

      const myBlocks = (blocks ?? []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (b: any) => b.staff_id === staffId &&
          (b.block_date === opts.bookingDate || b.recurring_dow === dow),
      )
      const hasBlock = myBlocks.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (b: any) => {
          const bStart = timeToMin(b.start_time)
          const bEnd = timeToMin(b.end_time)
          return startMin < bEnd && bStart < endMin
        },
      )
      if (hasBlock) continue

      return staffId
    }

    return null
  },
}
