import 'server-only'

// Async ingestion enqueue (PRD §5.3). In production we publish to Upstash QStash,
// which gives HTTP-native delivery to our Route Handler with built-in retries,
// exponential backoff, and `Deduplication-Id` idempotency. When QStash isn't
// configured (local dev) we fall back to a fire-and-forget POST straight to the
// worker route so the pipeline still runs end-to-end.

const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const WORKER_SECRET = process.env.CONTENT_WORKER_SECRET ?? 'dev-content-worker-secret'

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

/** Internal header the worker checks to reject unauthenticated calls. */
export function workerSecret(): string {
  return WORKER_SECRET
}

/**
 * Enqueue a content row for poster processing.
 * @param id        creator_content.id
 * @param dedupId   url_hash — collapses duplicate submits into one job
 */
export async function enqueueContentProcessing(id: string, dedupId: string): Promise<void> {
  const target = `${siteUrl()}/api/content/process`

  if (QSTASH_TOKEN && /^https?:\/\//.test(siteUrl()) && !siteUrl().includes('localhost')) {
    const res = await fetch(`https://qstash.upstash.io/v2/publish/${target}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Deduplication-Id': dedupId,
        // QStash forwards Upstash-Forward-* headers to the destination, stripped of the prefix.
        'Upstash-Forward-x-internal-secret': WORKER_SECRET,
      },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      throw new Error(`QStash publish failed: ${res.status} ${await res.text()}`)
    }
    return
  }

  // Dev fallback: kick the worker directly, don't block the Server Action on it.
  void fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': WORKER_SECRET },
    body: JSON.stringify({ id }),
  }).catch((err) => {
    console.error('[content] dev worker dispatch failed', err)
  })
}
