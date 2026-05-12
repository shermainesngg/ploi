import { z } from 'zod'

const socialPlatformSchema = z.enum(['tiktok', 'instagram', 'youtube', 'x', 'other'])

export const createLinkSchema = z.object({
  creatorSlug: z.string().min(1),
  businessSlug: z.string().min(1),
  contentUrl: z.string().url().optional().or(z.literal('')),
  platform: socialPlatformSchema.optional(),
  contentThumbnailUrl: z.string().url().optional().or(z.literal('')),
  featuredServiceId: z.string().uuid().optional().or(z.literal('')),
})

export const updateLinkStatusSchema = z.object({
  linkId: z.string().uuid(),
  status: z.enum(['pending', 'active', 'declined']),
})

export type CreateLinkInput = z.infer<typeof createLinkSchema>
export type UpdateLinkStatusInput = z.infer<typeof updateLinkStatusSchema>
