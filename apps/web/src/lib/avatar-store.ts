import 'server-only'
import { createServerClient } from '@/lib/supabase'

/** Public Storage bucket holding creator profile photos. */
export const AVATAR_BUCKET = 'avatars'

/** Image types we accept for a profile photo. */
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

export function isAllowedAvatarType(contentType: string): boolean {
  return contentType.toLowerCase() in ALLOWED_TYPES
}

/**
 * Upload a creator's profile photo to Supabase Storage and return its public URL.
 * Keyed per-creator with a unique suffix so the CDN never serves a stale image
 * after a re-upload. Uses the service-role client (bypasses RLS).
 */
export async function storeAvatar(
  slug: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[contentType.toLowerCase()] ?? 'jpg'
  const key = `${slug}/${Date.now()}.${ext}`

  const db = createServerClient()
  const { error } = await db.storage
    .from(AVATAR_BUCKET)
    .upload(key, buffer, { contentType, upsert: true })
  if (error) throw new Error(error.message)

  const { data } = db.storage.from(AVATAR_BUCKET).getPublicUrl(key)
  return data.publicUrl
}
