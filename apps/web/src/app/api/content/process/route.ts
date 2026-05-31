import { NextRequest, NextResponse } from 'next/server'
import { ContentService } from '@/services/content.service'
import { workerSecret } from '@/lib/qstash'

// Vercel Node runtime — NOT Edge (poster download + Storage upload exceed the
// 2s CPU isolate limit). QStash retries on 5xx with exponential backoff; a 489
// + Upstash-NonRetryable-Error header tells QStash to stop (deleted/private).
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Auth: QStash forwards our internal secret as `x-internal-secret`; the dev
  // fallback sets the same header directly.
  if (req.headers.get('x-internal-secret') !== workerSecret()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let id: string | undefined
  try {
    ;({ id } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const { outcome } = await ContentService.process(id)
    if (outcome === 'unavailable') {
      // Terminal — do not retry.
      return NextResponse.json(
        { outcome },
        { status: 489, headers: { 'Upstash-NonRetryable-Error': 'true' } },
      )
    }
    return NextResponse.json({ outcome })
  } catch (err) {
    // Transient — 500 makes QStash retry with backoff.
    console.error('[content] process failed', id, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'processing failed' },
      { status: 500 },
    )
  }
}
