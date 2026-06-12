import { NextRequest, NextResponse } from 'next/server'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import { BusinessRepo } from '@/repositories/business.repo'
import { decryptSecret } from '@/lib/crypto'
import { isGoogleCalendarConfigured, getOAuthClient } from '@/lib/google-calendar'

/**
 * POST /api/businesses/:slug/google-calendar/disconnect
 *
 * Owner-only. Best-effort revokes the refresh token with Google, then clears all
 * stored Google creds so future bookings stop syncing. Already-pushed events are
 * intentionally LEFT in place (decision).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const access = await authorizeBusinessDashboard(slug)
  if (access === 'not_found') {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  if (access !== 'granted') {
    return NextResponse.json(
      { error: 'Not authorized to manage this business' },
      { status: access === 'unauthenticated' ? 401 : 403 },
    )
  }

  const businessId = await BusinessRepo.findIdBySlug(slug)
  if (!businessId) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Best-effort revoke — swallow failures (token may already be revoked).
  if (isGoogleCalendarConfigured()) {
    try {
      const creds = await BusinessRepo.getGoogleCreds(businessId)
      if (creds?.google_refresh_token) {
        await getOAuthClient().revokeToken(decryptSecret(creds.google_refresh_token))
      }
    } catch (err) {
      console.error(`[calendar-sync] token revoke failed for ${slug} (clearing anyway):`, err)
    }
  }

  await BusinessRepo.clearGoogleCreds(businessId)
  return NextResponse.json({ ok: true })
}
