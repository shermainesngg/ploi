/**
 * Real-time availability engine.
 *
 * Given a business + service + date + optional staffId, computes which time
 * slots are bookable.
 *
 * Behaviour:
 *   - No staffId given:
 *       Slot is available if at least one eligible staff is available
 *       (or, if the business has no staff configured at all, the original
 *        business-wide availability applies).
 *   - staffId given:
 *       Use that staff's schedule (or business hours fallback) and only their bookings.
 */

import { createServerClient, isSupabaseConfigured } from './supabase'
import type { DayKey } from './types'

const SLOT_INTERVAL_MIN = 30

export interface SlotGroup {
  label: 'Morning' | 'Afternoon' | 'Evening'
  slots: { time: string; available: boolean; reason?: string }[]
}

export interface AvailabilityResult {
  date: string
  closed: boolean
  hours: string | null
  groups: SlotGroup[]
}

const DOW_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + (m || 0)
}
function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
interface Interval { startMin: number; endMin: number }
function overlaps(a: Interval, b: Interval): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin
}
function groupForHour(h: number): SlotGroup['label'] {
  if (h < 12) return 'Morning'
  if (h < 18) return 'Afternoon'
  return 'Evening'
}

function buildMockAvailability(dateISO: string, durationMin: number): AvailabilityResult {
  const groups: SlotGroup[] = [
    { label: 'Morning', slots: [] },
    { label: 'Afternoon', slots: [] },
    { label: 'Evening', slots: [] },
  ]
  const sessions = [
    { label: 'Morning' as const, startH: 9, endH: 12 },
    { label: 'Afternoon' as const, startH: 13, endH: 17 },
    { label: 'Evening' as const, startH: 18, endH: 20 },
  ]
  const unavailable = new Set(['10:00', '13:30', '18:00'])
  for (const s of sessions) {
    const arr: { time: string; available: boolean }[] = []
    for (let h = s.startH; h < s.endH; h++) {
      for (const m of [0, 30]) {
        if (h * 60 + m + durationMin > s.endH * 60) continue
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        arr.push({ time: t, available: !unavailable.has(t) })
      }
    }
    groups.find((g) => g.label === s.label)!.slots = arr
  }
  return { date: dateISO, closed: false, hours: '09:00-20:00', groups }
}

export async function getAvailableSlots(
  businessSlug: string,
  dateISO: string,
  serviceId?: string,
  staffId?: string,
  locationId?: string,
): Promise<AvailabilityResult | null> {
  if (!isSupabaseConfigured()) {
    return buildMockAvailability(dateISO, 60)
  }

  const db = createServerClient()

  const { data: business } = await db
    .from('businesses')
    .select('id, opening_hours')
    .eq('slug', businessSlug)
    .single()
  if (!business) return null

  // When a location is specified, its hours override the business hours and
  // availability is scoped to that branch's staff/bookings. Falls back to the
  // business hours if the branch hasn't set its own.
  let locationHours: Record<string, string> | null = null
  if (locationId) {
    const { data: loc } = await db
      .from('locations')
      .select('opening_hours')
      .eq('id', locationId)
      .single()
    locationHours = (loc?.opening_hours as Record<string, string> | null) ?? null
  }

  let durationMin = 60
  let bufferMin = 0
  if (serviceId) {
    const { data: svc } = await db
      .from('services')
      .select('duration, buffer_minutes')
      .eq('id', serviceId)
      .single()
    if (svc) {
      durationMin = svc.duration ?? 60
      bufferMin = svc.buffer_minutes ?? 0
    }
  }

  const date = new Date(`${dateISO}T00:00:00`)
  const dowKey = DOW_KEYS[date.getDay()]
  const dowNum = date.getDay()

  // Opening hours: location's own hours when given, else business hours.
  const openingHours = locationHours ?? (business.opening_hours as Record<string, string> | null)
  const businessTodayHours = openingHours?.[dowKey]
  if (!businessTodayHours || businessTodayHours === 'closed') {
    return { date: dateISO, closed: true, hours: null, groups: [] }
  }
  const [bizOpenStr, bizCloseStr] = businessTodayHours.split('-')
  const bizOpenMin = timeToMinutes(bizOpenStr)
  const bizCloseMin = timeToMinutes(bizCloseStr)

  // Determine eligible staff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let staffMembers: any[] = []
  let businessHasStaff = false
  if (serviceId) {
    let staffQuery = db
      .from('staff')
      .select('id')
      .eq('business_id', business.id)
      .eq('is_active', true)
    // Each staff belongs to one location; scope to the chosen branch when given.
    if (locationId) staffQuery = staffQuery.eq('location_id', locationId)
    const { data: allStaff } = await staffQuery
    businessHasStaff = (allStaff ?? []).length > 0
    if (businessHasStaff) {
      const ids = (allStaff ?? []).map((s: { id: string }) => s.id)
      const { data: serviceStaff } = await db
        .from('staff_services')
        .select('staff_id')
        .eq('service_id', serviceId)
        .in('staff_id', ids)
      const eligibleIds = (serviceStaff ?? []).map((r: { staff_id: string }) => r.staff_id)
      // If a specific staffId was passed, only use that (if eligible)
      if (staffId) {
        if (!eligibleIds.includes(staffId)) {
          return { date: dateISO, closed: true, hours: null, groups: [] }
        }
        staffMembers = [{ id: staffId }]
      } else {
        staffMembers = eligibleIds.map((id) => ({ id }))
      }
    }
  }

  // For each candidate staff, fetch their schedule + bookings + blocks
  const staffData = new Map<string, {
    workMin: number
    workMax: number
    bookings: Interval[]
    blocks: Interval[]
  }>()

  if (staffMembers.length > 0) {
    const ids = staffMembers.map((s) => s.id)
    const [
      { data: schedules },
      { data: staffBookings },
      { data: staffBlocks },
    ] = await Promise.all([
      db.from('staff_schedules')
        .select('staff_id, day_of_week, start_time, end_time, is_available')
        .in('staff_id', ids)
        .eq('day_of_week', dowNum),
      db.from('bookings')
        .select('staff_id, booking_time, services(duration, buffer_minutes)')
        .in('staff_id', ids)
        .eq('booking_date', dateISO)
        .in('status', ['pending', 'confirmed']),
      db.from('time_blocks')
        .select('staff_id, block_date, recurring_dow, start_time, end_time')
        .in('staff_id', ids)
        .or(`block_date.eq.${dateISO},recurring_dow.eq.${dowNum}`),
    ])

    for (const s of staffMembers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sched = (schedules ?? []).find((r: any) => r.staff_id === s.id)
      let workMin = bizOpenMin
      let workMax = bizCloseMin
      if (sched) {
        if (!sched.is_available) {
          // Off this day
          staffData.set(s.id, { workMin: 0, workMax: 0, bookings: [], blocks: [] })
          continue
        }
        workMin = Math.max(bizOpenMin, timeToMinutes(sched.start_time))
        workMax = Math.min(bizCloseMin, timeToMinutes(sched.end_time))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myBookings = (staffBookings ?? []).filter((b: any) => b.staff_id === s.id)
      const bookings: Interval[] = myBookings.map((b: { booking_time: string; services: { duration?: number; buffer_minutes?: number } | { duration?: number; buffer_minutes?: number }[] | null }) => {
        const sv = Array.isArray(b.services) ? b.services[0] : b.services
        const start = timeToMinutes(b.booking_time)
        const end = start + (sv?.duration ?? 60) + (sv?.buffer_minutes ?? 0)
        return { startMin: start, endMin: end }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myBlocks = (staffBlocks ?? []).filter((b: any) => b.staff_id === s.id)
      const blocks: Interval[] = myBlocks.map((b: { start_time: string; end_time: string }) => ({
        startMin: timeToMinutes(b.start_time),
        endMin: timeToMinutes(b.end_time),
      }))

      staffData.set(s.id, { workMin, workMax, bookings, blocks })
    }
  }

  // Business-wide bookings (when no staff assigned to business at all)
  let bookedIntervals: Interval[] = []
  let blockIntervals: Interval[] = []
  if (!businessHasStaff) {
    let bookingQuery = db
      .from('bookings')
      .select('booking_time, services(duration, buffer_minutes)')
      .eq('business_id', business.id)
      .eq('booking_date', dateISO)
      .in('status', ['pending', 'confirmed'])
    if (locationId) bookingQuery = bookingQuery.eq('location_id', locationId)
    const { data: bookingRows } = await bookingQuery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookedIntervals = (bookingRows ?? []).map((b: any) => {
      const sv = Array.isArray(b.services) ? b.services[0] : b.services
      const start = timeToMinutes(b.booking_time)
      const end = start + (sv?.duration ?? 60) + (sv?.buffer_minutes ?? 0)
      return { startMin: start, endMin: end }
    })

    const { data: blockRows } = await db
      .from('time_blocks')
      .select('block_date, recurring_dow, start_time, end_time')
      .eq('business_id', business.id)
      .is('staff_id', null)
      .or(`block_date.eq.${dateISO},recurring_dow.eq.${dowNum}`)
    blockIntervals = (blockRows ?? []).map((b: { start_time: string; end_time: string }) => ({
      startMin: timeToMinutes(b.start_time),
      endMin: timeToMinutes(b.end_time),
    }))
  } else {
    // Even with staff, business-wide blocks (e.g. holiday) apply to everyone
    const { data: bizBlocks } = await db
      .from('time_blocks')
      .select('block_date, recurring_dow, start_time, end_time')
      .eq('business_id', business.id)
      .is('staff_id', null)
      .or(`block_date.eq.${dateISO},recurring_dow.eq.${dowNum}`)
    blockIntervals = (bizBlocks ?? []).map((b: { start_time: string; end_time: string }) => ({
      startMin: timeToMinutes(b.start_time),
      endMin: timeToMinutes(b.end_time),
    }))
  }

  const isToday = dateISO === new Date().toISOString().split('T')[0]
  const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -Infinity

  const totalNeeded = durationMin + bufferMin
  const groupsMap: Record<SlotGroup['label'], SlotGroup['slots']> = {
    Morning: [], Afternoon: [], Evening: [],
  }

  for (let t = bizOpenMin; t + totalNeeded <= bizCloseMin; t += SLOT_INTERVAL_MIN) {
    const candidate: Interval = { startMin: t, endMin: t + totalNeeded }
    const isPast = t < nowMin
    const conflictBlock = blockIntervals.some((b) => overlaps(b, candidate))

    let available = false
    let reason: string | undefined

    if (isPast) {
      reason = 'past'
    } else if (conflictBlock) {
      reason = 'blocked'
    } else if (businessHasStaff && staffMembers.length > 0) {
      // Slot is available if at least one staff is free + within their hours
      let anyStaffAvailable = false
      for (const [, sd] of staffData) {
        if (sd.workMin === 0 && sd.workMax === 0) continue  // off this day
        if (t < sd.workMin || t + totalNeeded > sd.workMax) continue
        if (sd.bookings.some((b) => overlaps(b, candidate))) continue
        if (sd.blocks.some((b) => overlaps(b, candidate))) continue
        anyStaffAvailable = true
        break
      }
      available = anyStaffAvailable
      if (!available) reason = 'booked'
    } else if (businessHasStaff) {
      // Service has staff configured but none can do it (or only specific staff requested)
      reason = 'unavailable'
    } else {
      // No staff at this business — fall back to business-wide bookings
      const conflictBooked = bookedIntervals.some((b) => overlaps(b, candidate))
      available = !conflictBooked
      if (conflictBooked) reason = 'booked'
    }

    const slot = { time: minutesToTimeStr(t), available, reason }
    groupsMap[groupForHour(Math.floor(t / 60))].push(slot)
  }

  const groups: SlotGroup[] = (['Morning', 'Afternoon', 'Evening'] as const)
    .map((label) => ({ label, slots: groupsMap[label] }))
    .filter((g) => g.slots.length > 0)

  return {
    date: dateISO,
    closed: false,
    hours: businessTodayHours,
    groups,
  }
}
