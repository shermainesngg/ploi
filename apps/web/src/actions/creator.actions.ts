'use server'

import { createCreatorSchema } from '@/validation/creator.schema'
import { CreatorService } from '@/services/creator.service'
import { isReservedSlug } from '@/lib/constants'
import { ownsBusiness } from '@/lib/auth'
import { createAuthServerClient } from '@/lib/supabase-server'
import type { Social, SocialPlatform } from '@/lib/types'

export async function createCreator(formData: FormData) {
  // Business identities are exclusive — a business account can never also
  // join as a creator.
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && (await ownsBusiness(user.id, user.email))) {
    return { error: 'A business account can’t also join as a creator.' }
  }

  const raw = Object.fromEntries(formData)

  let socials: Social[] = []
  const socialsJson = raw.socials
  if (typeof socialsJson === 'string') {
    try { socials = JSON.parse(socialsJson) } catch { /* empty */ }
  }

  const parsed = createCreatorSchema.safeParse({
    ...raw,
    socials,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { handle, displayName, bio, email } = parsed.data

  const slug = handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)

  if (!slug) {
    return { error: { handle: ['Please choose a handle with at least one letter or number.'] } }
  }
  if (isReservedSlug(slug)) {
    return { error: { handle: ['That handle is reserved. Please choose a different one.'] } }
  }

  const cleanHandle = `@${slug}`

  const validPlatforms: SocialPlatform[] = ['tiktok', 'instagram', 'youtube', 'x', 'other']
  const cleanSocials: Social[] = (parsed.data.socials ?? []).filter(
    (s) => validPlatforms.includes(s.platform),
  )

  try {
    const result = await CreatorService.create({
      slug,
      handle: cleanHandle,
      displayName,
      bio,
      email: email && email.trim() ? email.trim() : undefined,
      socials: cleanSocials,
    })
    return { success: true, slug: result.slug, id: result.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create creator' }
  }
}
