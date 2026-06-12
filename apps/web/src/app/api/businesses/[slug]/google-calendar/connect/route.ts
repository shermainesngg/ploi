import { NextRequest, NextResponse } from 'next/server'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import {
  isGoogleCalendarConfigured,
  getOAuthClient,
  buildAuthUrl,
  encodeOAuthState,
  resolveBaseUrl,
  callbackUri,
} from '@/lib/google-calendar'

/**
 * GET /api/businesses/:slug/google-calendar/connect
 *
 * Owner-only. Redirects the browser to Google's consent screen. This is a
 * top-level navigation (an `<a href>` from the dashboard), not a fetch — Google
 * redirects back to the sibling `callback` route on approval.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { error: 'Google Calendar not configured. Set GOOGLE_CLIENT_ID/SECRET + GCAL_TOKEN_ENC_KEY.' },
      { status: 400 },
    )
  }

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

  const base = resolveBaseUrl(req)
  const client = getOAuthClient(callbackUri(base, slug))
  const url = buildAuthUrl(client, encodeOAuthState(slug))
  return NextResponse.redirect(url)
}
