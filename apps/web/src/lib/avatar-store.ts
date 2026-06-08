import 'server-only'
import { createServerClient } from '@/lib/supabase'

/** Public Storage bucket holding creator profile photos. */
export const AVATAR_BUCKET = 'avatars'

/** Public Storage bucket holding business gallery photos (migration_011). */
export const BUSINESS_PHOTOS_BUCKET = 'business-photos'

/** Image types we accept for an uploaded photo. */
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
 * Upload an image to a public Storage bucket and return its public URL.
 * Keys carry a unique suffix so the CDN never serves a stale image after a
 * re-upload. Uses the service-role client (bypasses RLS).
 */
export async function storePublicImage(
  bucket: string,
  slug: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[contentType.toLowerCase()] ?? 'jpg'
  const key = `${slug}/${Date.now()}.${ext}`

  const db = createServerClient()
  const { error } = await db.storage
    .from(bucket)
    .upload(key, buffer, { contentType, upsert: true })
  if (error) throw new Error(error.message)

  const { data } = db.storage.from(bucket).getPublicUrl(key)
  return data.publicUrl
}

/** Upload a creator's profile photo and return its public URL. */
export async function storeAvatar(
  slug: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  return storePublicImage(AVATAR_BUCKET, slug, buffer, contentType)
}
