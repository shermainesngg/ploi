/**
 * Google Calendar OAuth + client wiring.
 *
 * Mirrors the `isEmailConfigured()` convention in `lib/email.ts`: when the
 * Google credentials are absent the whole feature is a silent no-op, so local
 * dev and demos never depend on a Google Cloud project.
 *
 * One-way only (PLOI → Google). We request the read-capable `calendar.events`
 * scope now so Phase 2's read side needs no re-consent, but we never read.
 */

import { google } from 'googleapis'
import { randomBytes, createHmac, timingSafeEqual } from 'crypto'

/**
 * The OAuth2 client type, derived from googleapis itself. Importing it from the
 * standalone `google-auth-library` package clashes — googleapis bundles its own
 * nested copy, so the two `OAuth2Client` types are structurally identical but
 * not assignable to each other.
 */
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>

/**
 * Read+write scope on calendar events. Sensitive (verification needed before
 * GA) but grants both read and write, so requesting it now covers Phase 2.
 */
export const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events']

/** True iff every Google Calendar secret is present. The feature's master gate. */
export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GCAL_TOKEN_ENC_KEY
  )
}

/**
 * A configured OAuth2 client. `redirectUri` is required for the auth-code flow
 * (connect/callback) but optional for token revocation (disconnect).
 */
export function getOAuthClient(redirectUri?: string): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  )
}

/**
 * Canonical base URL for building OAuth redirect URIs. Prefers
 * NEXT_PUBLIC_SITE_URL so the redirect_uri exactly matches what's registered in
 * the Google Cloud console (and is identical between connect and callback).
 */
export function resolveBaseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    req.headers.get('origin') ??
    new URL(req.url).origin
  )
}

/** The OAuth callback URI for a given business slug. */
export function callbackUri(base: string, slug: string): string {
  return `${base}/api/businesses/${slug}/google-calendar/callback`
}

/**
 * Build the consent URL. `access_type:'offline'` + `prompt:'consent'` together
 * guarantee Google returns a refresh_token even on re-consent — without
 * `prompt:'consent'` the token is withheld the second time around.
 */
export function buildAuthUrl(client: OAuth2Client, state: string): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: CALENDAR_SCOPES,
    state,
  })
}

/**
 * A Calendar API client authenticated by a refresh token. The OAuth client
 * auto-refreshes the short-lived access token from the refresh token, so we
 * only ever persist the refresh token.
 */
export function getCalendarClient(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({ refresh_token: refreshToken })
  return google.calendar({ version: 'v3', auth })
}

// ── OAuth `state` (CSRF protection) ───────────────────────────────────────────
// The state round-trips through Google so the callback can prove the request
// originated from our connect route for this exact slug. It's an HMAC-signed
// `slug:nonce` (keyed by the server-only GCAL_TOKEN_ENC_KEY), so an attacker
// can't forge a callback for an arbitrary business.

function stateKey(): Buffer {
  const raw = process.env.GCAL_TOKEN_ENC_KEY
  if (!raw) throw new Error('GCAL_TOKEN_ENC_KEY is not set — cannot sign OAuth state')
  return Buffer.from(raw, 'base64')
}

/** Build a signed, opaque `state` value embedding the slug + a random nonce. */
export function encodeOAuthState(slug: string): string {
  const payload = `${slug}:${randomBytes(8).toString('hex')}`
  const sig = createHmac('sha256', stateKey()).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

/** Verify the signature and return the embedded slug, or null if tampered. */
export function decodeOAuthState(state: string): string | null {
  const [payloadB64, sig] = state.split('.')
  if (!payloadB64 || !sig) return null
  const payload = Buffer.from(payloadB64, 'base64url').toString()
  const expected = createHmac('sha256', stateKey()).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return payload.split(':')[0] ?? null
}
