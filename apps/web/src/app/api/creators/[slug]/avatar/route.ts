import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { CreatorRepo } from '@/repositories/creator.repo'
import {
  storeAvatar,
  isAllowedAvatarType,
  MAX_AVATAR_BYTES,
} from '@/lib/avatar-store'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // Only the signed-in owner of this creator profile may change its photo.
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (me.creatorSlug !== slug) {
    return NextResponse.json({ error: 'Not your profile' }, { status: 403 })
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
    const url = await storeAvatar(slug, buffer, file.type)
    await CreatorRepo.updateAvatar(slug, url)
    revalidatePath(`/${slug}`)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
