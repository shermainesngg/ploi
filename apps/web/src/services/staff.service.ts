import { isSupabaseConfigured } from '@/lib/supabase'
import { StaffRepo } from '@/repositories/staff.repo'
import { BusinessRepo } from '@/repositories/business.repo'
import { LocationRepo } from '@/repositories/location.repo'

export interface StaffMember {
  id: string
  businessId: string
  locationId: string | null
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

/** Why a staff member can('t) take a given booking. `qualified` = available. */
export type StaffAvailabilityReason =
  | 'qualified'        // free — can take it
  | 'not_qualified'    // can't perform this service
  | 'day_off'          // not scheduled to work that weekday
  | 'outside_hours'    // booking falls outside their shift
  | 'double_booked'    // overlaps another of their bookings
  | 'time_off'         // personal time block covers it
  | 'business_closed'  // business-wide closure covers it

export interface StaffAvailability {
  staffId: string
  available: boolean
  reason: StaffAvailabilityReason
}

function timeToMin(t: string) {
  const [h, m] = String(t).slice(0, 5).split(':').map(Number)
  return h * 60 + (m || 0)
}

interface AvailabilityContext {
  allStaffIds: string[]
  eligibleIds: string[]
  startMin: number
  endMin: number
  dow: number
  dateISO: string
  businessClosed: boolean
  excludeBookingId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookings: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedules: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[]
}

/**
 * Fetch everything needed to judge staff availability for one (service, date,
 * time) window. Shared by pickEligibleStaff and getStaffAvailabilityForBooking
 * so the auto-assigner and the dashboard UI can never disagree. Returns null
 * when there are no active staff at all.
 */
async function buildAvailabilityContext(opts: {
  businessId: string
  serviceId: string
  bookingDate: string
  bookingTime: string
  locationId?: string | null
  excludeBookingId?: string
}): Promise<AvailabilityContext | null> {
  const { createServerClient } = await import('@/lib/supabase')
  const { data: svc } = await createServerClient()
    .from('services')
    .select('duration, buffer_minutes')
    .eq('id', opts.serviceId)
    .single()
  const duration = (svc?.duration ?? 60) + (svc?.buffer_minutes ?? 0)

  const allStaff = await StaffRepo.listActiveByBusinessId(opts.businessId, opts.locationId)
  const allStaffIds = allStaff.map((s) => s.id)
  if (allStaffIds.length === 0) return null

  const eligibleIds = await StaffRepo.listEligibleForService(opts.serviceId, allStaffIds)

  const date = new Date(`${opts.bookingDate}T00:00:00`)
  const dow = date.getDay()
  const [bh, bm] = opts.bookingTime.split(':').map(Number)
  const startMin = bh * 60 + (bm || 0)
  const endMin = startMin + duration

  const [bookings, schedules, blocks, businessBlocks] = await Promise.all([
    StaffRepo.listBookingsForStaffOnDate(eligibleIds, opts.bookingDate),
    StaffRepo.listSchedulesForStaffOnDow(eligibleIds, dow),
    StaffRepo.listBlocksForStaff(eligibleIds, opts.bookingDate, dow),
    StaffRepo.listBusinessWideBlocks(opts.businessId, opts.bookingDate, dow),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const businessClosed = (businessBlocks ?? []).some((b: any) =>
    startMin < timeToMin(b.end_time) && timeToMin(b.start_time) < endMin)

  return { allStaffIds, eligibleIds, startMin, endMin, dow, dateISO: opts.bookingDate, businessClosed, excludeBookingId: opts.excludeBookingId, bookings, schedules, blocks }
}

/** The single source of truth for one staff member's verdict in a context. */
function reasonForStaff(staffId: string, ctx: AvailabilityContext): StaffAvailabilityReason {
  if (!ctx.eligibleIds.includes(staffId)) return 'not_qualified'
  if (ctx.businessClosed) return 'business_closed'

  // Weekly schedule. No row for that weekday → treated as available (matches the
  // original auto-assigner behaviour).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sched = (ctx.schedules ?? []).find((s: any) => s.staff_id === staffId && s.day_of_week === ctx.dow)
  if (sched) {
    if (!sched.is_available) return 'day_off'
    if (ctx.startMin < timeToMin(sched.start_time) || ctx.endMin > timeToMin(sched.end_time)) return 'outside_hours'
  }

  // Booking conflicts — exclude the booking being edited from its own check.
  const overlaps = (ctx.bookings ?? []).some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b: any) => {
      if (b.staff_id !== staffId || b.id === ctx.excludeBookingId) return false
      const sv = Array.isArray(b.services) ? b.services[0] : b.services
      const bStart = timeToMin(b.booking_time)
      const bEnd = bStart + (sv?.duration ?? 60) + (sv?.buffer_minutes ?? 0)
      return ctx.startMin < bEnd && bStart < ctx.endMin
    },
  )
  if (overlaps) return 'double_booked'

  // Personal time off.
  const blocked = (ctx.blocks ?? []).some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b: any) => {
      if (b.staff_id !== staffId || !(b.block_date === ctx.dateISO || b.recurring_dow === ctx.dow)) return false
      return ctx.startMin < timeToMin(b.end_time) && timeToMin(b.start_time) < ctx.endMin
    },
  )
  if (blocked) return 'time_off'

  return 'qualified'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStaff(r: any, serviceIds: string[]): StaffMember {
  return {
    id: r.id,
    businessId: r.business_id,
    locationId: r.location_id ?? null,
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
    data: { name: string; role?: string; photoUrl?: string; serviceIds: string[]; locationId?: string | null },
  ): Promise<StaffMember> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const businessId = await BusinessRepo.findIdBySlug(businessSlug)
    if (!businessId) throw new Error('Business not found')

    // Default new staff to the business's primary location when none specified.
    let locationId = data.locationId ?? null
    if (!locationId) {
      const primary = await LocationRepo.findPrimaryByBusinessId(businessId)
      locationId = primary?.id ?? null
    }

    const row = await StaffRepo.insert({
      business_id: businessId,
      location_id: locationId,
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
    data: { name?: string; role?: string; photoUrl?: string; serviceIds?: string[]; locationId?: string | null },
  ) {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

    const update: Record<string, unknown> = {}
    if (data.name !== undefined) update.name = data.name
    if (data.role !== undefined) update.role = data.role || null
    if (data.photoUrl !== undefined) update.photo_url = data.photoUrl || null
    if (data.locationId !== undefined) update.location_id = data.locationId || null
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
    locationId?: string | null
  }): Promise<string | null> {
    if (!isSupabaseConfigured()) return null
    const ctx = await buildAvailabilityContext(opts)
    if (!ctx) return null
    // First eligible staff member who is free for the slot.
    for (const staffId of ctx.eligibleIds) {
      if (reasonForStaff(staffId, ctx) === 'qualified') return staffId
    }
    return null
  },

  /**
   * Availability verdict for EVERY active staff member against one booking's
   * (service, date, time). Powers the greyed-out staff chips in the dashboard.
   * Pass `excludeBookingId` when judging a booking that's already assigned, so
   * the assignee isn't flagged as double-booked against their own appointment.
   */
  async getStaffAvailabilityForBooking(opts: {
    businessId: string
    serviceId: string
    bookingDate: string
    bookingTime: string
    locationId?: string | null
    excludeBookingId?: string
  }): Promise<StaffAvailability[]> {
    if (!isSupabaseConfigured()) return []
    const ctx = await buildAvailabilityContext(opts)
    if (!ctx) return []
    return ctx.allStaffIds.map((staffId) => {
      const reason = reasonForStaff(staffId, ctx)
      return { staffId, available: reason === 'qualified', reason }
    })
  },
}
