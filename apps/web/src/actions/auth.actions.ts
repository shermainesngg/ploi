'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { getCurrentUser, PLOI_ACTIVE_ROLE, type UserRole } from '@/lib/auth'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'

const roleSchema = z.enum(['creator', 'business', 'consumer'])

const ONE_YEAR = 60 * 60 * 24 * 365

const signUpSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type CreateAccountResult =
  | { ok: true }
  | { alreadyRegistered: true }
  | { error: string }

/**
 * Create a password account server-side and mark the email confirmed, so signup
 * never depends on a confirmation email (which is rate-limited and gates the
 * session). The caller then signs in client-side to establish the session cookie.
 * Returns `alreadyRegistered` instead of throwing so the UI can say "log in instead".
 */
export async function createConfirmedAccount(
  email: string,
  password: string,
): Promise<CreateAccountResult> {
  if (!isSupabaseConfigured()) return { error: 'Auth is not configured.' }

  const parsed = signUpSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email or password.' }
  }

  const admin = createServerClient()
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  })

  if (error) {
    const msg = (error.message ?? '').toLowerCase()
    if (
      error.status === 422 ||
      msg.includes('already') ||
      msg.includes('registered') ||
      msg.includes('exists')
    ) {
      return { alreadyRegistered: true }
    }
    return { error: error.message ?? 'Could not create account.' }
  }

  return { ok: true }
}

/**
 * Switch the active role for a multi-role user. Writes the `ploi_active_role`
 * cookie so subsequent server renders (layout, dashboards) resolve to that role.
 * Only succeeds if the current user actually owns the requested role.
 */
export async function setActiveRole(role: UserRole) {
  const parsed = roleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Invalid role' }

  const user = await getCurrentUser()
  if (!user) return { error: 'Not signed in' }
  if (!user.roles.includes(parsed.data)) return { error: 'You do not have that role' }

  const store = await cookies()
  store.set(PLOI_ACTIVE_ROLE, parsed.data, {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR,
  })

  return { success: true }
}
