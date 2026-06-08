import { createServerClient } from '@/lib/supabase'

export const BusinessRepo = {
  async findBySlug(slug: string) {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('*, services(*), locations(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    return data
  },

  async findIdBySlug(slug: string): Promise<string | null> {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .single()
    return data?.id ?? null
  },

  async findBySlugWithStripe(slug: string) {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('id, slug, name, stripe_account_id')
      .eq('slug', slug)
      .single()
    return data
  },

  async updateBySlug(slug: string, updates: Record<string, unknown>) {
    const db = createServerClient()
    const { error } = await db
      .from('businesses')
      .update(updates)
      .eq('slug', slug)
    if (error) throw new Error(error.message)
  },

  async findServiceById(serviceId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('services')
      .select('id, name, price, duration, buffer_minutes')
      .eq('id', serviceId)
      .single()
    return data
  },

  async findBusinessById(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('id, slug, name, stripe_account_id')
      .eq('id', businessId)
      .single()
    return data
  },

  // ── Google Calendar credentials ────────────────────────────────────────────
  // The refresh token is stored ENCRYPTED (AES-256-GCM via lib/crypto); callers
  // decrypt with `decryptSecret` only on the server, never exposing it to the
  // browser.

  /** Read the stored Google creds for a business (encrypted refresh token). */
  async getGoogleCreds(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('businesses')
      .select('google_refresh_token, google_calendar_id, google_calendar_timezone')
      .eq('id', businessId)
      .maybeSingle()
    return data
  },

  /** Persist Google creds at connect time. `refreshTokenEnc` is already encrypted. */
  async setGoogleCreds(
    businessId: string,
    creds: { refreshTokenEnc: string; calendarId: string; timezone: string | null },
  ) {
    const db = createServerClient()
    const { error } = await db
      .from('businesses')
      .update({
        google_refresh_token: creds.refreshTokenEnc,
        google_calendar_id: creds.calendarId,
        google_calendar_timezone: creds.timezone,
        google_last_synced_at: new Date().toISOString(),
      })
      .eq('id', businessId)
    if (error) throw new Error(error.message)
  },

  /** Null out all Google credential columns on disconnect (events left in place). */
  async clearGoogleCreds(businessId: string) {
    const db = createServerClient()
    const { error } = await db
      .from('businesses')
      .update({
        google_refresh_token: null,
        google_calendar_id: null,
        google_calendar_timezone: null,
        google_sync_token: null,
        google_last_synced_at: null,
      })
      .eq('id', businessId)
    if (error) throw new Error(error.message)
  },
}
