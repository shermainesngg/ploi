import { NextRequest, NextResponse } from 'next/server'
import { recordLinkClick } from '@/lib/db'

// POST /api/links/[id]/click — id is actually the short_code in `creator/business` form,
// since clients have the slugs not the UUID.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const decoded = decodeURIComponent(id)
    const [creatorSlug, businessSlug] = decoded.split('/')
    if (!creatorSlug || !businessSlug) {
      return NextResponse.json({ error: 'Expected <creator>/<business>' }, { status: 400 })
    }
    await recordLinkClick(creatorSlug, businessSlug)
    return NextResponse.json({ recorded: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
