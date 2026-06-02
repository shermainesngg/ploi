import { NextRequest, NextResponse } from 'next/server'
import { CreatorService } from '@/services/creator.service'
import { createAuthServerClient } from '@/lib/supabase-server'
import { isReservedSlug } from '@/lib/constants'
import { PLOI_ACTIVE_ROLE } from '@/lib/auth'
import type { Social, SocialPlatform } from '@/lib/types'

const ONE_YEAR = 60 * 60 * 24 * 365

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { handle, displayName, email, bio, socials } = body

    if (!handle || !displayName) {
      return NextResponse.json({ error: 'handle and displayName are required' }, { status: 400 })
    }

    const slug = handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)

    if (!slug) {
      return NextResponse.json({ error: 'Please choose a handle with at least one letter or number.' }, { status: 400 })
    }
    if (isReservedSlug(slug)) {
      return NextResponse.json({ error: 'That handle is reserved. Please choose a different one.' }, { status: 400 })
    }

    const cleanHandle = `@${slug}`

    // Validate socials shape
    const validPlatforms: SocialPlatform[] = ['tiktok', 'instagram', 'youtube', 'x', 'other']
    const cleanSocials: Social[] = Array.isArray(socials)
      ? socials
          .filter((s: { platform?: string; url?: string }) =>
            s && s.platform && s.url && validPlatforms.includes(s.platform as SocialPlatform),
          )
          .map((s) => ({ platform: s.platform as SocialPlatform, url: s.url as string }))
      : []

    // If the visitor is signed in, attach the creator profile to their auth user
    // so it joins their existing account (and default the contact email to theirs).
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const resolvedEmail =
      (typeof email === 'string' && email.trim() ? email.trim() : undefined) ?? user?.email

    const creator = await CreatorService.create({
      slug,
      handle: cleanHandle,
      displayName,
      bio: bio ?? '',
      email: resolvedEmail,
      authUserId: user?.id,
      socials: cleanSocials,
    })

    const res = NextResponse.json({ slug: creator.slug, id: creator.id }, { status: 201 })
    if (user) {
      res.cookies.set(PLOI_ACTIVE_ROLE, 'creator', { path: '/', sameSite: 'lax', maxAge: ONE_YEAR })
    }
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  // Search would go here; for now, just confirm the endpoint exists
  return NextResponse.json({ message: 'Use POST to create a creator' })
}
