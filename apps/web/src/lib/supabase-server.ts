import 'server-only'
import { createServerClient as createSsrServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase'

/** Server component / API route — reads session from cookies. */
export async function createAuthServerClient() {
  const cookieStore = await cookies()
  return createSsrServer(
    SUPABASE_URL!,
    SUPABASE_PUBLISHABLE_KEY!,
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
