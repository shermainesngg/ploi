import { createServerClient, isSupabaseConfigured } from './supabase'
import { createAuthServerClient } from './supabase-server'

export type UserRole = 'creator' | 'business' | 'consumer'

export interface AppUser {
  id: string  // auth user id
  email: string
  role: UserRole
  // For each role, the slug of their owned record (if any)
  creatorSlug?: string
  businessSlug?: string
  displayName?: string
  avatarColor?: string
  avatarInitials?: string
}

/**
 * Get the current authenticated user + their role.
 * Returns null if not logged in or Supabase not configured.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null

  const auth = await createAuthServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user || !user.email) return null

  const admin = createServerClient()

  // Try creator first
  const { data: creator } = await admin
    .from('creators')
    .select('slug, display_name, handle')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (creator) {
    const initials = (creator.display_name as string)
      .split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase()
    return {
      id: user.id,
      email: user.email,
      role: 'creator',
      creatorSlug: creator.slug,
      displayName: creator.display_name,
      avatarInitials: initials,
      avatarColor: '#e11d48',
    }
  }

  // Try business
  const { data: business } = await admin
    .from('businesses')
    .select('slug, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (business) {
    return {
      id: user.id,
      email: user.email,
      role: 'business',
      businessSlug: business.slug,
      displayName: business.name,
      avatarInitials: business.name.charAt(0).toUpperCase(),
      avatarColor: '#3b82f6',
    }
  }

  // Try consumer
  const { data: consumer } = await admin
    .from('consumers')
    .select('id, name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (consumer) {
    const name = consumer.name as string | null
    return {
      id: user.id,
      email: user.email,
      role: 'consumer',
      displayName: name ?? user.email,
      avatarInitials: (name?.charAt(0) ?? user.email.charAt(0)).toUpperCase(),
      avatarColor: '#10b981',
    }
  }

  // Auth user with no record yet — create a consumer row
  await admin.from('consumers').insert({
    auth_user_id: user.id,
    email: user.email,
  })

  return {
    id: user.id,
    email: user.email,
    role: 'consumer',
    displayName: user.email,
    avatarInitials: user.email.charAt(0).toUpperCase(),
    avatarColor: '#10b981',
  }
}

/** Link an existing creator/business record to an auth user (after they sign in for the first time). */
export async function linkAuthUserToRecord(
  authUserId: string,
  email: string,
): Promise<UserRole | null> {
  if (!isSupabaseConfigured()) return null
  const admin = createServerClient()

  // If a creator record exists with this email, link it
  const { data: cre } = await admin
    .from('creators')
    .select('id')
    .eq('email', email)
    .is('auth_user_id', null)
    .maybeSingle()
  if (cre) {
    await admin.from('creators').update({ auth_user_id: authUserId }).eq('id', cre.id)
    return 'creator'
  }

  const { data: biz } = await admin
    .from('businesses')
    .select('id')
    .eq('email', email)
    .is('auth_user_id', null)
    .maybeSingle()
  if (biz) {
    await admin.from('businesses').update({ auth_user_id: authUserId }).eq('id', biz.id)
    return 'business'
  }

  // Otherwise, ensure a consumer row
  const { data: con } = await admin
    .from('consumers')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (con) {
    await admin.from('consumers').update({ auth_user_id: authUserId }).eq('id', con.id)
  } else {
    await admin.from('consumers').insert({ auth_user_id: authUserId, email })
  }
  return 'consumer'
}
