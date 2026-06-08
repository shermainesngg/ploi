import { NextRequest, NextResponse } from 'next/server'
import { ContentService } from '@/services/content.service'

// POST /api/content/[id]/click — id is the creator_content UUID. Records a tap on
// a specific video (per-video attribution). Best-effort: clients fire-and-forget.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await ContentService.recordClick(decodeURIComponent(id))
    return NextResponse.json({ recorded: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
