import { z } from 'zod'

export const checkoutSchema = z.object({
  serviceId: z.string().uuid(),
  businessId: z.string().uuid(),
  linkId: z.string().uuid().nullable().optional(),
  staffId: z.string().uuid().nullable().optional(),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
