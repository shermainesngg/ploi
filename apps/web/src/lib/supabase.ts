import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSsrBrowser } from '@supabase/ssr'

// Supabase's newer key naming is publishable/secret; the legacy naming is
// anon/service_role. We accept either env-var name so the app works regardless
// of which scheme an environment (local, Vercel Preview/Production) is set up
// with — a name mismatch used to silently drop us into seed-data fallback mode.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)
}

/** Browser auth-aware client — for components that read auth state. */
export function createAuthBrowserClient() {
  return createSsrBrowser(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!)
}

// Note: server-only auth client is in `supabase-server.ts`. Import it directly from there.

/** Legacy/simple browser client (no auth handling) — kept for back-compat. */
export function createBrowserClient() {
  return createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!)
}

/**
 * Server-side admin client — uses the secret/service-role key (bypasses RLS).
 * Only call from API routes / Server Components, never expose to browser.
 */
export function createServerClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    SUPABASE_PUBLISHABLE_KEY

  return createClient(SUPABASE_URL!, key!)
}
