'use server'

import { createLinkSchema, updateLinkStatusSchema } from '@/validation/link.schema'
import { LinkService } from '@/services/link.service'
import { createServerClient } from '@/lib/supabase'
import type { SocialPlatform } from '@/lib/types'

export async function createLink(formData: FormData) {
  const raw = Object.fromEntries(formData)
  const parsed = createLinkSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { creatorSlug, businessSlug, contentUrl, platform, contentThumbnailUrl, featuredServiceId } = parsed.data

  const db = createServerClient()
  const [{ data: creator }, { data: business }] = await Promise.all([
    db.from('creators').select('id').eq('slug', creatorSlug).single(),
    db.from('businesses').select('id').eq('slug', businessSlug).single(),
  ])

  if (!creator) return { error: 'Creator not found' }
  if (!business) return { error: 'Business not found' }

  let validFeatured: string | null = null
  if (featuredServiceId) {
    const { data: svc } = await db
      .from('services')
      .select('id')
      .eq('id', featuredServiceId)
      .eq('business_id', business.id)
      .maybeSingle()
    if (svc) validFeatured = svc.id
  }

  try {
    const link = await LinkService.create({
      creatorId: creator.id,
      businessId: business.id,
      shortCode: `${creatorSlug}/${businessSlug}`,
      contentUrl: contentUrl || undefined,
      platform: platform as SocialPlatform | undefined,
      contentThumbnailUrl: contentThumbnailUrl || undefined,
      featuredServiceId: validFeatured,
    })
    return { success: true, id: link.id, shortCode: link.short_code, status: link.status }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create link' }
  }
}

export async function updateLinkStatus(formData: FormData) {
  const parsed = updateLinkStatusSchema.safeParse({
    linkId: formData.get('linkId'),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    await LinkService.updateStatus(parsed.data.linkId, parsed.data.status)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update link status' }
  }
}
