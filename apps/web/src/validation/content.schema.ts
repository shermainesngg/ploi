import { z } from 'zod'

/** Creator submits a content URL to attach to an existing link. */
export const submitContentSchema = z.object({
  linkId: z.string().uuid(),
  contentUrl: z.string().url(),
})

/** Business moderates a piece of content (approve / hide). */
export const moderateContentSchema = z.object({
  contentId: z.string().uuid(),
  businessId: z.string().uuid(),
  status: z.enum(['active', 'hidden']),
})

export type SubmitContentInput = z.infer<typeof submitContentSchema>
export type ModerateContentInput = z.infer<typeof moderateContentSchema>
