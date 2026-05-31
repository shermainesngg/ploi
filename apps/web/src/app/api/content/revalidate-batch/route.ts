import { NextRequest, NextResponse } from 'next/server'
import { ContentService } from '@/services/content.service'
import { workerSecret } from '@/lib/qstash'

// Called by Supabase pg_cron + pg_net on a schedule (PRD §5.3). Selects the N
// soonest-to-expire posters and re-enqueues each to the idempotent worker —
// O(expiring), not O(total).
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = req.headers.get('x-internal-secret')
  const expected = workerSecret()
  if (auth !== `Bearer ${expected}` && secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let limit = 50
  try {
    const body = await req.json()
    if (typeof body?.limit === 'number' && body.limit > 0) limit = Math.min(body.limit, 500)
  } catch {
    /* default limit */
  }

  const requeued = await ContentService.revalidateBatch(limit)
  return NextResponse.json({ requeued })
}
