import { NextRequest, NextResponse } from 'next/server'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import { BusinessRepo } from '@/repositories/business.repo'
import { encryptSecret } from '@/lib/crypto'
import {
  isGoogleCalendarConfigured,
  getOAuthClient,
  getCalendarClient,
  decodeOAuthState,
  resolveBaseUrl,
  callbackUri,
} from '@/lib/google-calendar'

/**
 * GET /api/businesses/:slug/google-calendar/callback
 *
 * Google redirects here after consent. Exchanges the auth code for tokens,
 * stores the encrypted refresh token + the calendar's timezone, and bounces the
 * owner back to the Calendar tab. Any failure redirects with `?gcal=error`
 * rather than surfacing a 500.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const base = resolveBaseUrl(req)
  const dash = (q: string) => `${base}/dashboard/business/${slug}?tab=calendar&${q}`

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 })
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

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // CSRF: the state must be our HMAC-signed value for this exact slug.
  if (!code || !state || decodeOAuthState(state) !== slug) {
    return NextResponse.redirect(dash('gcal=error&reason=invalid_state'))
  }

  try {
    const client = getOAuthClient(callbackUri(base, slug))
    const { tokens } = await client.getToken(code)

    if (!tokens.refresh_token) {
      // Happens if the user previously consented without prompt=consent. Our
      // connect route forces consent, so this should be rare.
      return NextResponse.redirect(dash('gcal=error&reason=no_refresh_token'))
    }

    // Read the primary calendar's timezone once, to anchor future event times.
    let timezone: string | null = null
    try {
      const calendar = getCalendarClient(tokens.refresh_token)
      const cal = await calendar.calendars.get({ calendarId: 'primary' })
      timezone = cal.data.timeZone ?? null
    } catch (err) {
      console.error(`[calendar-sync] could not read calendar timezone for ${slug}:`, err)
    }

    const businessId = await BusinessRepo.findIdBySlug(slug)
    if (!businessId) {
      return NextResponse.redirect(dash('gcal=error&reason=not_found'))
    }

    await BusinessRepo.setGoogleCreds(businessId, {
      refreshTokenEnc: encryptSecret(tokens.refresh_token),
      calendarId: 'primary',
      timezone,
    })

    return NextResponse.redirect(dash('gcal=connected'))
  } catch (err) {
    console.error(`[calendar-sync] OAuth callback failed for ${slug}:`, err)
    return NextResponse.redirect(dash('gcal=error'))
  }
}
