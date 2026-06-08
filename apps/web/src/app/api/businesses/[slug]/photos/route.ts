import { NextRequest, NextResponse } from 'next/server'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import {
  storePublicImage,
  isAllowedAvatarType,
  MAX_AVATAR_BYTES,
  BUSINESS_PHOTOS_BUCKET,
} from '@/lib/avatar-store'

/**
 * POST /api/businesses/[slug]/photos — upload one gallery photo.
 * Returns the public URL; the client adds it to the photos array and persists
 * via PATCH /api/businesses/[slug]. Owner-only (unclaimed/demo stays open).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const access = await authorizeBusinessDashboard(slug)
  if (access === 'not_found') {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  if (access !== 'granted') {
    return NextResponse.json(
      { error: 'Not authorized to edit this business' },
      { status: access === 'unauthenticated' ? 401 : 403 },
    )
  }

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
    const url = await storePublicImage(BUSINESS_PHOTOS_BUCKET, slug, buffer, file.type)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
