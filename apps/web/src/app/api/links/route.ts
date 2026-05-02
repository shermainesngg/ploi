import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createLink } from '@/lib/db'
import type { SocialPlatform } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { creatorSlug, businessSlug, contentUrl, platform, contentThumbnailUrl } = body

    if (!creatorSlug || !businessSlug) {
      return NextResponse.json({ error: 'creatorSlug and businessSlug are required' }, { status: 400 })
    }

    const db = createServerClient()
    const [{ data: creator }, { data: business }] = await Promise.all([
      db.from('creators').select('id').eq('slug', creatorSlug).single(),
      db.from('businesses').select('id').eq('slug', businessSlug).single(),
    ])

    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const validPlatforms: SocialPlatform[] = ['tiktok', 'instagram', 'youtube', 'x', 'other']
    const cleanPlatform: SocialPlatform | undefined =
      platform && validPlatforms.includes(platform) ? (platform as SocialPlatform) : undefined

    const link = await createLink({
      creatorId: creator.id,
      businessId: business.id,
      shortCode: `${creatorSlug}/${businessSlug}`,
      contentUrl,
      platform: cleanPlatform,
      contentThumbnailUrl,
    })

    return NextResponse.json(
      {
        id: link.id,
        creatorSlug,
        businessSlug,
        shortCode: link.short_code,
        status: link.status,
      },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
