import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { LinkService } from '@/services/link.service'
import { ContentService } from '@/services/content.service'
import type { SocialPlatform } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { creatorSlug, businessSlug, contentUrl, platform, contentThumbnailUrl, featuredServiceId } = body

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

    // Validate featured service belongs to this business if provided
    let validFeatured: string | null = null
    if (typeof featuredServiceId === 'string' && featuredServiceId.length > 0) {
      const { data: svc } = await db
        .from('services')
        .select('id')
        .eq('id', featuredServiceId)
        .eq('business_id', business.id)
        .maybeSingle()
      if (svc) validFeatured = svc.id
    }

    const link = await LinkService.create({
      creatorId: creator.id,
      businessId: business.id,
      shortCode: `${creatorSlug}/${businessSlug}`,
      contentUrl,
      platform: cleanPlatform,
      contentThumbnailUrl,
      featuredServiceId: validFeatured,
    })

    // Best-effort: enroll a supported content URL into the async ingestion
    // pipeline (creator_content + poster fetch). Never block link creation on it —
    // unsupported providers (Phase 1 = TikTok only) and pipeline hiccups are swallowed.
    if (typeof contentUrl === 'string' && contentUrl.trim()) {
      try {
        await ContentService.submit({ linkId: link.id, contentUrl: contentUrl.trim() })
      } catch (err) {
        console.warn('[links] content enrollment skipped', err instanceof Error ? err.message : err)
      }
    }

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
