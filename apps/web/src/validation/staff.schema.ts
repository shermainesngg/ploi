import { z } from 'zod'
import { dateSchema, timeSchema } from './common.schema'

export const createStaffSchema = z.object({
  businessSlug: z.string().min(1),
  name: z.string().min(1).max(100),
  role: z.string().max(100).optional().or(z.literal('')),
  photoUrl: z.string().url().optional().or(z.literal('')),
  serviceIds: z.array(z.string().uuid()).default([]),
})

export const updateStaffSchema = z.object({
  staffId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  role: z.string().max(100).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  serviceIds: z.array(z.string().uuid()).optional(),
})

export const staffScheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  isAvailable: z.boolean(),
})

export const setStaffScheduleSchema = z.object({
  staffId: z.string().uuid(),
  schedule: z.array(staffScheduleEntrySchema),
})

export const createStaffBlockSchema = z.object({
  staffId: z.string().uuid(),
  blockDate: dateSchema,
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  reason: z.string().max(200).optional().or(z.literal('')),
})

export const deleteStaffBlockSchema = z.object({
  blockId: z.string().uuid(),
})

export const createWalkinSchema = z.object({
  businessSlug: z.string().min(1),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  customerName: z.string().max(100).default('Walk-in'),
  bookingDate: dateSchema,
  bookingTime: timeSchema,
})

export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>
export type SetStaffScheduleInput = z.infer<typeof setStaffScheduleSchema>
export type CreateStaffBlockInput = z.infer<typeof createStaffBlockSchema>
export type CreateWalkinInput = z.infer<typeof createWalkinSchema>
