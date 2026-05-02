import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createCreator as dbCreateCreator } from '@/lib/db'
import type { Social, SocialPlatform } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { handle, displayName, email, bio, socials } = body

    if (!handle || !displayName) {
      return NextResponse.json({ error: 'handle and displayName are required' }, { status: 400 })
    }

    const slug = handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)
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

    const creator = await dbCreateCreator({
      slug,
      handle: cleanHandle,
      displayName,
      bio: bio ?? '',
      email: typeof email === 'string' && email.trim() ? email.trim() : undefined,
      socials: cleanSocials,
    })

    return NextResponse.json({ slug: creator.slug, id: creator.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  // Search would go here; for now, just confirm the endpoint exists
  return NextResponse.json({ message: 'Use POST to create a creator' })
}
