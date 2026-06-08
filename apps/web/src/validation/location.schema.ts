import { z } from 'zod'

/**
 * A business location (branch). Address is required; hours/contacts/photos are
 * optional and fall back to the business defaults where empty. `isPrimary` is
 * managed by the service, not set directly here.
 */
export const createLocationSchema = z.object({
  name: z.string().max(80).optional().or(z.literal('')),
  address: z.string().min(1).max(200),
  openingHours: z.record(z.string(), z.string()).optional(),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  contactWhatsapp: z.string().max(50).optional().or(z.literal('')),
  contactLine: z.string().max(50).optional().or(z.literal('')),
  photos: z.array(z.string().url()).max(8).optional(),
})

export const updateLocationSchema = createLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
