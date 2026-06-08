import { z } from 'zod'

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  duration: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0),
})

export const createBusinessSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  location: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  email: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  contactWhatsapp: z.string().optional().or(z.literal('')),
  contactLine: z.string().optional().or(z.literal('')),
  photos: z.array(z.string().url()).optional(),
  openingHours: z.record(z.string(), z.string()).optional(),
  services: z.array(serviceSchema).min(1, 'At least one service is required'),
})

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>

/**
 * Settings update — profile fields only. Slug (shared namespace), email
 * (login identity), and services are deliberately not editable here.
 */
export const updateBusinessSchema = z
  .object({
    name: z.string().min(1).max(100),
    category: z.string().min(1).max(50),
    location: z.string().min(1).max(200),
    description: z.string().max(1000).default(''),
    contactPhone: z.string().max(50).optional().or(z.literal('')),
    contactWhatsapp: z.string().max(50).optional().or(z.literal('')),
    contactLine: z.string().max(50).optional().or(z.literal('')),
    photos: z.array(z.string().url()).max(8).default([]),
    openingHours: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (d) => `${d.contactPhone ?? ''}${d.contactWhatsapp ?? ''}${d.contactLine ?? ''}`.trim().length > 0,
    { message: 'At least one contact method is required' },
  )

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
