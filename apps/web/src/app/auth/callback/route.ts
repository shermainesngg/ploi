import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server'
import { createServerClient } from '@/lib/supabase'
import { linkAuthUserToRecord, pickDashboardPath, PLOI_ACTIVE_ROLE, type UserRole } from '@/lib/auth'

const ONE_YEAR = 60 * 60 * 24 * 365

function parseRole(value: string | null): UserRole | null {
  return value === 'creator' || value === 'business' ? value : null
}

/** Redirect helper that also persists the active-role cookie on the response. */
function redirectWithRole(origin: string, path: string, role: UserRole | null) {
  const res = NextResponse.redirect(`${origin}${path}`)
  if (role) {
    res.cookies.set(PLOI_ACTIVE_ROLE, role, { path: '/', sameSite: 'lax', maxAge: ONE_YEAR })
  }
  return res
}

/**
 * Magic-link callback. Supabase redirects here with `?code=...` (and optionally
 * `?role=creator|business`) after the user clicks the email link. We exchange the
 * code for a session, link the auth user to any existing record (role-aware when a
 * role hint is present), then route to the right dashboard — or into onboarding if
 * no record exists yet for the requested role.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const role = parseRole(searchParams.get('role'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createAuthServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // Link an existing record by email (role-aware when we have a hint).
  await linkAuthUserToRecord(user.id, user.email, role ?? undefined)

  // Explicit `next` always wins.
  if (next && next !== '/') {
    return redirectWithRole(origin, next, role)
  }

  const db = createServerClient()

  // Role-specific entry: go to that dashboard if owned, else into onboarding.
  if (role === 'creator') {
    const { data } = await db
      .from('creators')
      .select('slug')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (data?.slug) return redirectWithRole(origin, `/dashboard/creator/${data.slug}`, 'creator')
    return NextResponse.redirect(`${origin}/onboard/creator`)
  }

  if (role === 'business') {
    const { data } = await db
      .from('businesses')
      .select('slug')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (data?.slug) return redirectWithRole(origin, '/business', 'business')
    return NextResponse.redirect(`${origin}/onboard/business`)
  }

  // No role hint (the common path now that login is unified, and how Google OAuth
  // returns) — infer the destination from the records this email owns.
  const lastUsed = parseRole(req.cookies.get(PLOI_ACTIVE_ROLE)?.value ?? null)
  const { path, role: dest } = await pickDashboardPath(user.id, lastUsed)
  return redirectWithRole(origin, path, dest)
}
