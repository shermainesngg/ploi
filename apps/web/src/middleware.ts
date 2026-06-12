import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Refresh Supabase session cookies on every request so server components
 * always see the latest auth state.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Prefetch requests (Next.js router warming a Link's loading shell) don't need
  // a session refresh — they never render authed content, only the loading.tsx
  // boundary. Skipping the Supabase Auth round-trip here keeps prefetch cheap, so
  // the destination's skeleton is cached and clicking it paints instantly instead
  // of stalling on the previous page. The next real navigation refreshes the session.
  const purpose = request.headers.get('sec-purpose') ?? request.headers.get('purpose')
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' || purpose?.includes('prefetch')
  if (isPrefetch) return response

  // Accept either the newer publishable key name or the legacy anon key name.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return response
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Skip static files & images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
