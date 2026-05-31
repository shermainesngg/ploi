import 'server-only'
import { createServerClient } from '@/lib/supabase'
import { POSTER_BUCKET } from '@/lib/poster'
import type { Provider } from '@/lib/types'

/**
 * Download a remote poster and self-host it in Supabase Storage. Returns the
 * host-agnostic object key for `poster_path`. Self-hosting kills thumbnail-URL
 * rot and lets `next/image` optimize against a stable original (PRD §D9/§D12).
 *
 * Dev fallback: if Storage isn't reachable/configured, returns the absolute
 * remote URL so the pipeline still completes locally (logged).
 */
export async function storePoster(
  provider: Provider,
  urlHash: string,
  remoteUrl: string,
): Promise<string> {
  const key = `${provider}/${urlHash}.jpg`

  try {
    const res = await fetch(remoteUrl, {
      headers: { 'User-Agent': 'BridgeBot/1.0 (+https://bridge.app)' },
    })
    if (!res.ok) throw new Error(`poster download ${res.status}`)
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())

    const db = createServerClient()
    const { error } = await db.storage
      .from(POSTER_BUCKET)
      .upload(key, buffer, { contentType, upsert: true })
    if (error) throw error

    return key
  } catch (err) {
    console.warn('[content] poster self-host failed, falling back to remote URL', err)
    return remoteUrl
  }
}
