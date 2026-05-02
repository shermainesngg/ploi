import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase-server'
import { linkAuthUserToRecord } from '@/lib/auth'

/**
 * Magic-link callback. Supabase redirects here with `?code=...` after the user clicks the email link.
 * We exchange the code for a session, link the auth user to any existing creator/business/consumer
 * record matched by email, then redirect based on role.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

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

  // Link to creator/business record (or create consumer row)
  const role = await linkAuthUserToRecord(user.id, user.email)

  // Decide where to send them
  if (next && next !== '/') {
    return NextResponse.redirect(`${origin}${next}`)
  }

  if (role === 'creator') {
    // We need the slug — re-query
    const { createServerClient: admin } = await import('@/lib/supabase')
    const db = admin()
    const { data } = await db
      .from('creators')
      .select('slug')
      .eq('auth_user_id', user.id)
      .single()
    if (data?.slug) return NextResponse.redirect(`${origin}/dashboard/creator/${data.slug}`)
  }
  if (role === 'business') {
    const { createServerClient: admin } = await import('@/lib/supabase')
    const db = admin()
    const { data } = await db
      .from('businesses')
      .select('slug')
      .eq('auth_user_id', user.id)
      .single()
    if (data?.slug) return NextResponse.redirect(`${origin}/dashboard/business/${data.slug}`)
  }

  return NextResponse.redirect(`${origin}/bookings`)
}
