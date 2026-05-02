import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSsrBrowser } from '@supabase/ssr'

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/** Browser auth-aware client — for components that read auth state. */
export function createAuthBrowserClient() {
  return createSsrBrowser(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Note: server-only auth client is in `supabase-server.ts`. Import it directly from there.

/** Legacy/simple browser client (no auth handling) — kept for back-compat. */
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * Server-side admin client — uses service role key (bypasses RLS).
 * Only call from API routes / Server Components, never expose to browser.
 */
export function createServerClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key!)
}
