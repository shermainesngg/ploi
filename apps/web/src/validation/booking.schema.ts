import { z } from 'zod'

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  linkId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
})

export const updateBookingStatusSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['confirmed', 'declined']),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
