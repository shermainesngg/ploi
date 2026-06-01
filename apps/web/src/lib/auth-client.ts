import { createAuthBrowserClient, isSupabaseConfigured } from './supabase'
import { createConfirmedAccount } from '@/actions/auth.actions'

/**
 * Browser-side auth helpers. These run in client components only — they read
 * window.location for redirect URLs and write the Supabase session cookie so a
 * subsequent navigation to a server route (e.g. /auth/post-login) sees the session.
 */

export interface SignUpResult {
  /** True when a session was created immediately (always true on success here). */
  hasSession: boolean
  /** True when the email is already registered — caller should send them to /login. */
  alreadyRegistered: boolean
}

/**
 * Create a password account and sign in. The account is created server-side with
 * the email pre-confirmed (see createConfirmedAccount), so signup never blocks on a
 * confirmation email — we then sign in here to establish the session cookie, leaving
 * the user authenticated so record creation links to them immediately.
 * Returns flags rather than throwing on "already registered" so the caller can show
 * a friendly "log in instead" hint. No-op when Supabase isn't configured (seed mode).
 */
export async function signUpWithPassword(email: string, password: string): Promise<SignUpResult> {
  if (!isSupabaseConfigured()) return { hasSession: false, alreadyRegistered: false }

  const result = await createConfirmedAccount(email.trim(), password)
  if ('alreadyRegistered' in result) return { hasSession: false, alreadyRegistered: true }
  if ('error' in result) throw new Error(result.error)

  // Account exists and is confirmed; establish the browser session cookie.
  const supabase = createAuthBrowserClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(error.message)

  return { hasSession: true, alreadyRegistered: false }
}

/** Kick off a Google OAuth sign-in. Supabase redirects back to /auth/callback. */
export async function signInWithGoogle(next?: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Auth not configured. Add Supabase keys to .env.local.')

  const supabase = createAuthBrowserClient()
  const callback = new URL(`${window.location.origin}/auth/callback`)
  if (next && next !== '/') callback.searchParams.set('next', next)

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  })
  if (error) throw new Error(error.message)
}
