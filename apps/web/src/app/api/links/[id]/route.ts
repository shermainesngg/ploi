import { NextRequest, NextResponse } from 'next/server'
import { LinkService } from '@/services/link.service'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { decideAccess, getAuthIdentity } from '@/lib/ownership'
import type { LinkStatus } from '@/lib/types'

/**
 * PATCH /api/links/[id] — approve/decline a creator link request.
 * Only the business the link points at (or an unclaimed/demo business) may
 * change its status.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body
    const valid: LinkStatus[] = ['pending', 'active', 'declined']
    if (!valid.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${valid.join(', ')}` }, { status: 400 })
    }

    // ── Ownership: only the link's business can approve/decline ─────────────
    const db = createServerClient()
    const [{ data: link }, user] = await Promise.all([
      db
        .from('links')
        .select('id, businesses ( auth_user_id )')
        .eq('id', id)
        .maybeSingle(),
      getAuthIdentity(),
    ])
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    const biz = Array.isArray(link.businesses) ? link.businesses[0] : link.businesses
    if (!biz || decideAccess(user, biz) !== 'granted') {
      return NextResponse.json(
        { error: 'Not authorized to update this link' },
        { status: user ? 403 : 401 },
      )
    }

    await LinkService.updateStatus(id, status)
    return NextResponse.json({ id, status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
