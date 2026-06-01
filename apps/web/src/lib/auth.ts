import { cookies } from 'next/headers'
import { createServerClient, isSupabaseConfigured } from './supabase'
import { createAuthServerClient } from './supabase-server'

export type UserRole = 'creator' | 'business' | 'consumer'

/** Cookie that remembers which role's dashboard the user is currently viewing. */
export const PLOI_ACTIVE_ROLE = 'ploi_active_role'

/** Role priority used to pick a default active role when the cookie is absent/invalid. */
const ROLE_PRIORITY: UserRole[] = ['business', 'creator', 'consumer']

export interface AppUser {
  id: string  // auth user id
  email: string
  /** Every role this auth user owns a record for. */
  roles: UserRole[]
  /** The role whose dashboard is currently active (cookie-driven). */
  activeRole: UserRole
  /** Alias of activeRole — kept for existing consumers (NavBar, dashHref, etc.). */
  role: UserRole
  // Slugs of owned records, populated whenever the row exists (independent of activeRole).
  creatorSlug?: string
  businessSlug?: string
  // Display fields reflect the ACTIVE role.
  displayName?: string
  avatarColor?: string
  avatarInitials?: string
}

const ROLE_AVATAR_COLOR: Record<UserRole, string> = {
  creator: '#e11d48',
  business: '#3b82f6',
  consumer: '#10b981',
}

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Read the active-role cookie. Returns null if unset. */
export async function getActiveRoleCookie(): Promise<UserRole | null> {
  const store = await cookies()
  const value = store.get(PLOI_ACTIVE_ROLE)?.value
  if (value === 'creator' || value === 'business' || value === 'consumer') return value
  return null
}

/**
 * Get the current authenticated user, all the roles they own, and the active role.
 * Returns null if not logged in or Supabase not configured.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null

  const auth = await createAuthServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user || !user.email) return null

  const admin = createServerClient()

  const [{ data: creator }, { data: business }, { data: consumer }] = await Promise.all([
    admin
      .from('creators')
      .select('slug, display_name')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('businesses')
      .select('slug, name')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('consumers')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
  ])

  const roles: UserRole[] = []
  if (creator) roles.push('creator')
  if (business) roles.push('business')
  if (consumer) roles.push('consumer')

  // Auth user with no record yet — create a consumer row so they always have a role.
  let consumerName = consumer?.name as string | null | undefined
  if (roles.length === 0) {
    await admin.from('consumers').insert({ auth_user_id: user.id, email: user.email })
    roles.push('consumer')
    consumerName = null
  }

  // Pick the active role: cookie value if owned, otherwise first by priority.
  const cookieRole = await getActiveRoleCookie()
  const activeRole =
    cookieRole && roles.includes(cookieRole)
      ? cookieRole
      : (ROLE_PRIORITY.find((r) => roles.includes(r)) as UserRole)

  const base: AppUser = {
    id: user.id,
    email: user.email,
    roles,
    activeRole,
    role: activeRole,
    creatorSlug: creator?.slug,
    businessSlug: business?.slug,
    avatarColor: ROLE_AVATAR_COLOR[activeRole],
  }

  if (activeRole === 'creator' && creator) {
    base.displayName = creator.display_name
    base.avatarInitials = initialsFromName(creator.display_name)
  } else if (activeRole === 'business' && business) {
    base.displayName = business.name
    base.avatarInitials = business.name.charAt(0).toUpperCase()
  } else {
    const name = consumerName ?? user.email
    base.displayName = name
    base.avatarInitials = name.charAt(0).toUpperCase()
  }

  return base
}

/**
 * Decide which dashboard a freshly-authenticated user lands on, based purely on the
 * records they own (role is inferred from email/auth_user_id — no role chooser needed).
 *
 * Order: last-used role (cookie) if they own it → owned business → owned creator →
 * the customer bookings page as a fallback. Used by both /auth/callback (magic link +
 * OAuth) and /auth/post-login (password sign-in).
 */
export async function pickDashboardPath(
  authUserId: string,
  lastUsed: UserRole | null,
): Promise<{ path: string; role: UserRole | null }> {
  if (!isSupabaseConfigured()) return { path: '/bookings', role: null }
  const db = createServerClient()

  const [{ data: biz }, { data: cre }] = await Promise.all([
    db.from('businesses').select('slug').eq('auth_user_id', authUserId).maybeSingle(),
    db.from('creators').select('slug').eq('auth_user_id', authUserId).maybeSingle(),
  ])

  if (lastUsed === 'creator' && cre?.slug) return { path: `/dashboard/creator/${cre.slug}`, role: 'creator' }
  if (lastUsed === 'business' && biz?.slug) return { path: `/dashboard/business/${biz.slug}`, role: 'business' }
  if (biz?.slug) return { path: `/dashboard/business/${biz.slug}`, role: 'business' }
  if (cre?.slug) return { path: `/dashboard/creator/${cre.slug}`, role: 'creator' }
  return { path: '/bookings', role: null }
}

/**
 * Link an existing record to an auth user (after they sign in for the first time).
 *
 * When `hint` is provided, only a record of THAT role is linked by email — we never
 * silently link a different role. Without a hint, falls back to the legacy
 * creator → business → consumer order for backwards compatibility.
 */
export async function linkAuthUserToRecord(
  authUserId: string,
  email: string,
  hint?: UserRole,
): Promise<UserRole | null> {
  if (!isSupabaseConfigured()) return null
  const admin = createServerClient()

  async function linkCreator(): Promise<UserRole | null> {
    const { data } = await admin
      .from('creators')
      .select('id')
      .eq('email', email)
      .is('auth_user_id', null)
      .maybeSingle()
    if (!data) return null
    await admin.from('creators').update({ auth_user_id: authUserId }).eq('id', data.id)
    return 'creator'
  }

  async function linkBusiness(): Promise<UserRole | null> {
    const { data } = await admin
      .from('businesses')
      .select('id')
      .eq('email', email)
      .is('auth_user_id', null)
      .maybeSingle()
    if (!data) return null
    await admin.from('businesses').update({ auth_user_id: authUserId }).eq('id', data.id)
    return 'business'
  }

  async function ensureConsumer(): Promise<UserRole> {
    const { data } = await admin
      .from('consumers')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (data) {
      await admin.from('consumers').update({ auth_user_id: authUserId }).eq('id', data.id)
    } else {
      await admin.from('consumers').insert({ auth_user_id: authUserId, email })
    }
    return 'consumer'
  }

  if (hint === 'creator') return (await linkCreator()) ?? (await ensureConsumer())
  if (hint === 'business') return (await linkBusiness()) ?? (await ensureConsumer())

  // No hint — legacy behaviour.
  return (await linkCreator()) ?? (await linkBusiness()) ?? (await ensureConsumer())
}
