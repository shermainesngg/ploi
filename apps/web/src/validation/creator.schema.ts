import { z } from 'zod'

const socialPlatformSchema = z.enum(['tiktok', 'instagram', 'youtube', 'x', 'other'])

const socialSchema = z.object({
  platform: socialPlatformSchema,
  url: z.string().url(),
})

export const createCreatorSchema = z.object({
  handle: z.string().min(1).max(30),
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).default(''),
  email: z.string().email().optional().or(z.literal('')),
  socials: z.array(socialSchema).optional(),
})

export type CreateCreatorInput = z.infer<typeof createCreatorSchema>
