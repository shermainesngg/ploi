import { NextRequest, NextResponse } from 'next/server'
import {
  storePublicImage,
  isAllowedAvatarType,
  MAX_AVATAR_BYTES,
  BUSINESS_PHOTOS_BUCKET,
} from '@/lib/avatar-store'

/**
 * POST /api/businesses/onboarding-photo — upload one gallery photo during the
 * business onboarding flow, before the business (and its slug) exist. Returns
 * the public URL; the wizard collects these and submits them with the create
 * call. Files land under an `_onboarding/` prefix in the public bucket.
 *
 * Unauthenticated by necessity (no account/business yet), mirroring the open
 * business-creation endpoint. Guarded by image-type and size limits.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!isAllowedAvatarType(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await storePublicImage(BUSINESS_PHOTOS_BUCKET, '_onboarding', buffer, file.type)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
