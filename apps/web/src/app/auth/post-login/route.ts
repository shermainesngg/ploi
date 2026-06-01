import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server'
import {
  linkAuthUserToRecord,
  pickDashboardPath,
  PLOI_ACTIVE_ROLE,
  type UserRole,
} from '@/lib/auth'

const ONE_YEAR = 60 * 60 * 24 * 365

function parseRole(value: string | null): UserRole | null {
  return value === 'creator' || value === 'business' || value === 'consumer' ? value : null
}

/**
 * Landing route for sign-ins that establish a session client-side (password sign-in),
 * so they never pass through /auth/callback. We have a live session cookie here; we
 * link any pre-created record by email and route to the right dashboard — the role is
 * inferred from what the email owns, not chosen by the user.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const next = searchParams.get('next')

  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // Link any record created during onboarding (by email) to this auth user.
  await linkAuthUserToRecord(user.id, user.email)

  const lastUsed = parseRole(req.cookies.get(PLOI_ACTIVE_ROLE)?.value ?? null)
  const { path, role } = await pickDashboardPath(user.id, lastUsed)

  const dest = next && next !== '/' ? next : path
  const res = NextResponse.redirect(`${origin}${dest}`)
  if (role) {
    res.cookies.set(PLOI_ACTIVE_ROLE, role, { path: '/', sameSite: 'lax', maxAge: ONE_YEAR })
  }
  return res
}
