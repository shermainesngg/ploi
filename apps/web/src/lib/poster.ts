// Posters are stored as a HOST-AGNOSTIC key in `poster_path` and resolved to a
// URL at render time. This lets us flip Supabase Storage → Cloudflare R2 as a
// config change when egress costs appear (PRD §6.3 / §8). Predictable posters
// (YouTube) store an absolute URL and pass through untouched.

export const POSTER_BUCKET = 'content-posters'

export function resolvePosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null
  if (/^https?:\/\//i.test(posterPath)) return posterPath // predictable (already absolute)

  const base = process.env.NEXT_PUBLIC_POSTER_CDN_URL // optional R2/CDN override
  if (base) return `${base.replace(/\/$/, '')}/${posterPath}`

  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabase) return null
  return `${supabase.replace(/\/$/, '')}/storage/v1/object/public/${POSTER_BUCKET}/${posterPath}`
}
