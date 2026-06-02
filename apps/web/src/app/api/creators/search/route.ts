import { NextRequest, NextResponse } from 'next/server'
import { CreatorService } from '@/services/creator.service'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  if (q.length < 1) return NextResponse.json([])
  const results = await CreatorService.search(q)
  // Slim payload — the search result card only needs identity + avatar.
  return NextResponse.json(
    results.map((c) => ({
      slug: c.slug,
      handle: c.handle,
      displayName: c.displayName,
      bio: c.bio,
      avatarInitials: c.avatarInitials,
      avatarColor: c.avatarColor,
      avatarUrl: c.avatarUrl ?? null,
    })),
  )
}
