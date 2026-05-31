import { createHash } from 'node:crypto'

/**
 * Normalize a content URL for idempotency: lowercase host, drop query + fragment
 * (tracking params, `?lang=`, share tokens), strip a trailing slash. Two links to
 * the same post collapse to one `url_hash`. Server-only (uses node:crypto).
 */
export function normalizeContentUrl(raw: string): string {
  const trimmed = raw.trim()
  try {
    const u = new URL(trimmed)
    u.hostname = u.hostname.toLowerCase()
    u.search = ''
    u.hash = ''
    let out = u.toString()
    if (out.endsWith('/')) out = out.slice(0, -1)
    return out
  } catch {
    // Not a parseable URL — fall back to the trimmed string so the hash is stable.
    return trimmed
  }
}

/** sha256 of the normalized URL — the `url_hash` idempotency key + QStash dedup id. */
export function contentUrlHash(raw: string): string {
  return createHash('sha256').update(normalizeContentUrl(raw)).digest('hex')
}
