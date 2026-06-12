import { cache } from 'react'
import { createServerClient, isSupabaseConfigured } from './supabase'

/** The minimal identity needed for ownership checks (no role lookups). */
export interface AuthIdentity {
  id: string
  email: string | null
}

/** A row that can be claimed by an auth user (businesses, creators). */
export interface ClaimableRecord {
  auth_user_id: string | null
}

export type AccessDecision = 'granted' | 'unauthenticated' | 'forbidden'
export type GuardResult = AccessDecision | 'not_found'

/**
 * Core ownership rule, shared by dashboard pages and API guards:
 *
 * - **Claimed** record (`auth_user_id` set): only that auth user gets access.
 * - **Unclaimed** record (`auth_user_id` null): open to everyone. This keeps
 *   seeded demo dashboards usable in staging; a real business/creator is
 *   linked to its auth user on first login (see `linkAuthUserToRecord`),
 *   which closes the record from then on.
 */
export function decideAccess(
  user: AuthIdentity | null,
  record: ClaimableRecord,
): AccessDecision {
  if (!record.auth_user_id) return 'granted'
  if (!user) return 'unauthenticated'
  return user.id === record.auth_user_id ? 'granted' : 'forbidden'
}

/**
 * Current auth user (id + email only) from the session cookie, or null.
 * Request-deduped via React `cache()` — every ownership guard in a single
 * render shares one `auth.getUser()` round-trip instead of re-validating
 * the session per call.
 */
export const getAuthIdentity = cache(async function getAuthIdentity(): Promise<AuthIdentity | null> {
  if (!isSupabaseConfigured()) return null
  // Lazy import: supabase-server pulls in `server-only`, which would break
  // importing the pure `decideAccess` from unit tests.
  const { createAuthServerClient } = await import('./supabase-server')
  const auth = await createAuthServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
})

async function authorizeBySlug(
  table: 'businesses' | 'creators',
  slug: string,
): Promise<GuardResult> {
  // Seed-data demo mode (no Supabase): nothing to own, keep the demo open.
  if (!isSupabaseConfigured()) return 'granted'
  const db = createServerClient()
  const { data } = await db
    .from(table)
    .select('auth_user_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return 'not_found'
  return decideAccess(await getAuthIdentity(), data)
}

/** Guard for `/dashboard/business/[slug]` (and any business-owner-only surface). */
export async function authorizeBusinessDashboard(slug: string): Promise<GuardResult> {
  return authorizeBySlug('businesses', slug)
}

/** Guard for `/dashboard/creator/[slug]`. */
export async function authorizeCreatorDashboard(slug: string): Promise<GuardResult> {
  return authorizeBySlug('creators', slug)
}

/** Owner check for a business by id (used by API routes that resolve a child row). */
export async function authorizeBusinessById(businessId: string): Promise<GuardResult> {
  if (!isSupabaseConfigured()) return 'granted'
  const db = createServerClient()
  const { data } = await db
    .from('businesses')
    .select('auth_user_id')
    .eq('id', businessId)
    .maybeSingle()
  if (!data) return 'not_found'
  return decideAccess(await getAuthIdentity(), data)
}
