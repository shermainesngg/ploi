'use server'

import {
  createStaffSchema,
  updateStaffSchema,
  setStaffScheduleSchema,
  createStaffBlockSchema,
  deleteStaffBlockSchema,
  createWalkinSchema,
} from '@/validation/staff.schema'
import { StaffService } from '@/services/staff.service'
import { DashboardService } from '@/services/dashboard.service'

export async function createStaffMember(formData: FormData) {
  const raw = Object.fromEntries(formData)
  let serviceIds: string[] = []
  const sidsJson = raw.serviceIds
  if (typeof sidsJson === 'string') {
    try { serviceIds = JSON.parse(sidsJson) } catch { /* empty */ }
  }

  const parsed = createStaffSchema.safeParse({ ...raw, serviceIds })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  try {
    const staff = await StaffService.create(parsed.data.businessSlug, {
      name: parsed.data.name,
      role: parsed.data.role || undefined,
      photoUrl: parsed.data.photoUrl || undefined,
      serviceIds: parsed.data.serviceIds,
    })
    return { success: true, id: staff.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create staff' }
  }
}

export async function updateStaffMember(formData: FormData) {
  const raw = Object.fromEntries(formData)
  let serviceIds: string[] | undefined
  const sidsJson = raw.serviceIds
  if (typeof sidsJson === 'string') {
    try { serviceIds = JSON.parse(sidsJson) } catch { /* empty */ }
  }

  const parsed = updateStaffSchema.safeParse({ ...raw, serviceIds })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  try {
    await StaffService.update(parsed.data.staffId, {
      name: parsed.data.name,
      role: parsed.data.role,
      photoUrl: parsed.data.photoUrl || undefined,
      serviceIds: parsed.data.serviceIds,
    })
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update staff' }
  }
}

export async function deactivateStaffMember(formData: FormData) {
  const staffId = formData.get('staffId')
  if (typeof staffId !== 'string') return { error: 'staffId is required' }

  try {
    await StaffService.deactivate(staffId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to deactivate staff' }
  }
}

export async function setStaffSchedule(formData: FormData) {
  const raw = Object.fromEntries(formData)
  let schedule: Array<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }> = []
  const schedJson = raw.schedule
  if (typeof schedJson === 'string') {
    try { schedule = JSON.parse(schedJson) } catch { /* empty */ }
  }

  const parsed = setStaffScheduleSchema.safeParse({ staffId: raw.staffId, schedule })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  try {
    await StaffService.setSchedule(parsed.data.staffId, parsed.data.schedule)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to set schedule' }
  }
}

export async function createStaffBlock(formData: FormData) {
  const parsed = createStaffBlockSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  try {
    const block = await StaffService.createBlock(parsed.data.staffId, {
      blockDate: parsed.data.blockDate,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      reason: parsed.data.reason || undefined,
    })
    return { success: true, id: block.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create block' }
  }
}

export async function deleteStaffBlock(formData: FormData) {
  const parsed = deleteStaffBlockSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  try {
    await StaffService.deleteBlock(parsed.data.blockId)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete block' }
  }
}

export async function createWalkinBooking(formData: FormData) {
  const parsed = createWalkinSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  try {
    const row = await DashboardService.createWalkinBooking({
      businessSlug: parsed.data.businessSlug,
      serviceId: parsed.data.serviceId,
      staffId: parsed.data.staffId,
      customerName: parsed.data.customerName,
      bookingDate: parsed.data.bookingDate,
      bookingTime: parsed.data.bookingTime,
    })
    return { success: true, id: row.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create walk-in booking' }
  }
}
