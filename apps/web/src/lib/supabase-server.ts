import 'server-only'
import { createServerClient as createSsrServer } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Server component / API route — reads session from cookies. */
export async function createAuthServerClient() {
  const cookieStore = await cookies()
  return createSsrServer(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // ignored — middleware refreshes session
          }
        },
      },
    },
  )
}
