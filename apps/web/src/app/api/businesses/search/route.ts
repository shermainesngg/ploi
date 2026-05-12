import { NextRequest, NextResponse } from 'next/server'
import { BusinessService } from '@/services/business.service'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  if (q.length < 1) return NextResponse.json([])
  const results = await BusinessService.search(q)
  // Slim payload — the search dropdown only needs name + slug + category + cover/gradient
  return NextResponse.json(
    results.map((b) => ({
      slug: b.slug,
      name: b.name,
      category: b.category,
      location: b.location,
      coverGradient: b.coverGradient,
      coverPhotoUrl: b.coverPhotoUrl,
    })),
  )
}
