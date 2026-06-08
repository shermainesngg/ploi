import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { CreatorContentRepo } from '@/repositories/creator-content.repo'
import { adapterForUrl, adapterForProvider } from '@/lib/providers'
import { contentUrlHash } from '@/lib/content-url'
import { enqueueContentProcessing } from '@/lib/qstash'
import { storePoster } from '@/lib/poster-store'
import { AttributionRepo } from '@/repositories/attribution.repo'
import { rowToContentWithCreator } from '@/lib/mappers'
import type { ContentWithCreator, ContentStatus, PosterSource } from '@/lib/types'

const POSTER_TTL_MS = 5 * 24 * 60 * 60 * 1000 // 5 days (PRD §5.2)

export class UnsupportedProviderError extends Error {}
export class ContentNotFoundError extends Error {}

export const ContentService = {
  /**
   * Submit-time work (sync, <1s): validate provider, parse id, idempotent insert,
   * enqueue the heavy fetch. The creator immediately sees "processing".
   */
  async submit(input: { linkId: string; contentUrl: string }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add env vars to .env.local to save data.')
    }

    const adapter = adapterForUrl(input.contentUrl)
    if (!adapter) {
      throw new UnsupportedProviderError('That link isn’t from a supported platform yet.')
    }

    const db = createServerClient()
    const { data: link } = await db
      .from('links')
      .select('id, creator_id, business_id')
      .eq('id', input.linkId)
      .maybeSingle()
    if (!link) throw new ContentNotFoundError('Link not found')

    const parsed = adapter.parse(input.contentUrl)
    const urlHash = contentUrlHash(input.contentUrl)

    const id = await CreatorContentRepo.insertPending({
      linkId: link.id,
      creatorId: link.creator_id,
      businessId: link.business_id,
      provider: adapter.id,
      contentUrl: input.contentUrl,
      externalId: parsed?.externalId ?? null,
      urlHash,
      mediaKind: parsed?.mediaKind ?? 'video',
      aspectRatio: parsed?.aspectRatio ?? adapter.defaultAspectRatio,
    })

    await enqueueContentProcessing(id, urlHash)
    return { id, status: 'pending' as const }
  },

  /**
   * Worker state machine (PRD §5.2). Returns a discriminated result the route
   * maps to an HTTP status: 'retry' must surface as a throw so QStash backs off.
   */
  async process(
    id: string,
  ): Promise<{ outcome: 'ok' | 'skipped' | 'unavailable' }> {
    const nowIso = new Date().toISOString()
    const row = await CreatorContentRepo.claimForProcessing(id, nowIso)
    if (!row) return { outcome: 'skipped' } // already fetching / ok / unavailable

    const adapter = adapterForProvider(row.provider)
    if (!adapter) {
      await CreatorContentRepo.markUnavailable(id)
      return { outcome: 'unavailable' }
    }

    let posterPath: string | null = row.poster_path ?? null
    let posterSource: PosterSource = adapter.poster === 'predictable' ? 'predictable' : 'oembed'
    let caption: string | null = row.caption ?? null
    let authorName: string | null = row.author_name ?? null

    if (adapter.fetchMeta) {
      let meta
      try {
        meta = await adapter.fetchMeta(row.content_url, row.external_id ?? '')
      } catch (err) {
        // Transient — bump attempts and rethrow so QStash retries with backoff.
        await CreatorContentRepo.markFailed(id, row.attempts ?? 0)
        throw err
      }

      if (meta.unavailable) {
        await CreatorContentRepo.markUnavailable(id)
        return { outcome: 'unavailable' }
      }

      caption = meta.caption ?? caption
      authorName = meta.authorName ?? authorName

      if (meta.thumbnailUrl && adapter.poster === 'oembed') {
        // Self-host: only flip to OK once the poster is durably stored.
        posterPath = await storePoster(adapter.id, row.url_hash, meta.thumbnailUrl)
        posterSource = 'oembed'
      } else if (meta.posterUrl) {
        posterPath = meta.posterUrl // predictable, absolute
        posterSource = 'predictable'
      }
    }

    await CreatorContentRepo.markOk(id, {
      posterPath,
      posterSource,
      caption,
      authorName,
      posterExpiresAt: new Date(Date.now() + POSTER_TTL_MS).toISOString(),
    })
    return { outcome: 'ok' }
  },

  /** Re-validation: re-enqueue the N soonest-to-expire posters (idempotent worker). */
  async revalidateBatch(limit: number): Promise<number> {
    const rows = await CreatorContentRepo.getSoonestToExpire(limit)
    for (const r of rows) {
      await CreatorContentRepo.resetForRevalidation(r.id)
      await enqueueContentProcessing(r.id, `revalidate:${r.id}`)
    }
    return rows.length
  },

  async listForBusiness(businessId: string): Promise<ContentWithCreator[]> {
    if (!isSupabaseConfigured()) return []
    const rows = await CreatorContentRepo.listActiveForBusiness(businessId)
    return rows.map(rowToContentWithCreator).filter(Boolean) as ContentWithCreator[]
  },

  /**
   * Record a tap on a specific video (Phase 1 per-video attribution). Bumps the
   * denormalized counter and logs a 'content_click' event. Only counts active
   * content; unknown/hidden videos are silently ignored. Best-effort — callers
   * fire-and-forget, so a failure here must never block the UI.
   */
  async recordClick(contentId: string) {
    if (!isSupabaseConfigured()) return
    const row = await CreatorContentRepo.findForClick(contentId)
    if (!row || row.status !== 'active') return
    await Promise.all([
      CreatorContentRepo.incrementClickCount(contentId, row.click_count ?? 0),
      AttributionRepo.insertEvent({
        link_id: row.link_id,
        content_id: contentId,
        event_type: 'content_click',
      }),
    ])
  },

  async listForCreator(creatorId: string): Promise<ContentWithCreator[]> {
    if (!isSupabaseConfigured()) return []
    const rows = await CreatorContentRepo.listActiveForCreator(creatorId)
    return rows.map(rowToContentWithCreator).filter(Boolean) as ContentWithCreator[]
  },

  async listPendingForBusiness(businessId: string): Promise<ContentWithCreator[]> {
    if (!isSupabaseConfigured()) return []
    const rows = await CreatorContentRepo.listPendingForBusiness(businessId)
    return rows.map(rowToContentWithCreator).filter(Boolean) as ContentWithCreator[]
  },

  async moderate(contentId: string, businessId: string, status: ContentStatus) {
    const ok = await CreatorContentRepo.setStatus(contentId, businessId, status)
    if (!ok) throw new ContentNotFoundError('Content not found for this business')
  },
}
