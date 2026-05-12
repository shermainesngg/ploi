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
