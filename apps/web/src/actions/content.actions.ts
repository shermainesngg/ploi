'use server'

import { revalidatePath } from 'next/cache'
import { submitContentSchema, moderateContentSchema } from '@/validation/content.schema'
import { ContentService } from '@/services/content.service'

export async function submitContent(formData: FormData) {
  const parsed = submitContentSchema.safeParse({
    linkId: formData.get('linkId'),
    contentUrl: formData.get('contentUrl'),
  })
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    const result = await ContentService.submit(parsed.data)
    return { success: true, id: result.id, status: result.status }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to submit content' }
  }
}

export async function moderateContent(formData: FormData) {
  const parsed = moderateContentSchema.safeParse({
    contentId: formData.get('contentId'),
    businessId: formData.get('businessId'),
    status: formData.get('status'),
  })
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    await ContentService.moderate(parsed.data.contentId, parsed.data.businessId, parsed.data.status)
    revalidatePath('/dashboard/business', 'layout')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update content' }
  }
}
