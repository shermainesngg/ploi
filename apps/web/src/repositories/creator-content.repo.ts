import { createServerClient } from '@/lib/supabase'
import type { ContentStatus, MediaKind, AspectRatio, Provider, PosterSource } from '@/lib/types'

// Columns the company/creator pages need (with the creator embedded for the chip).
const READ_SELECT = `
  id, link_id, creator_id, business_id, provider, content_url, external_id,
  media_kind, aspect_ratio, poster_source, poster_path, caption, author_name,
  fetch_status, status, sort_order, created_at,
  creators ( slug, handle, display_name )
`

export interface InsertContentInput {
  linkId: string
  creatorId: string
  businessId: string
  provider: Provider
  contentUrl: string
  externalId: string | null
  urlHash: string
  mediaKind: MediaKind
  aspectRatio: AspectRatio
}

export const CreatorContentRepo = {
  /**
   * Idempotent insert. ON CONFLICT(url_hash) DO NOTHING — a resubmit returns the
   * existing row id rather than creating a duplicate. Returns the row id either way.
   */
  async insertPending(input: InsertContentInput): Promise<string> {
    const db = createServerClient()
    // ON CONFLICT(url_hash) DO NOTHING. A duplicate may also trip the
    // (business, provider, external_id) guard — that's also a "same video"
    // resubmit, so we swallow it and resolve the existing row below.
    await db
      .from('creator_content')
      .upsert(
        {
          link_id: input.linkId,
          creator_id: input.creatorId,
          business_id: input.businessId,
          provider: input.provider,
          content_url: input.contentUrl,
          external_id: input.externalId,
          url_hash: input.urlHash,
          media_kind: input.mediaKind,
          aspect_ratio: input.aspectRatio,
          fetch_status: 'pending',
          status: 'pending',
        },
        { onConflict: 'url_hash', ignoreDuplicates: true },
      )

    const byHash = await db
      .from('creator_content')
      .select('id')
      .eq('url_hash', input.urlHash)
      .maybeSingle()
    if (byHash.data) return byHash.data.id

    // Fell foul of the external-id guard (different URL form, same video).
    const byExternal = await db
      .from('creator_content')
      .select('id')
      .eq('business_id', input.businessId)
      .eq('provider', input.provider)
      .eq('external_id', input.externalId)
      .maybeSingle()
    if (byExternal.data) return byExternal.data.id

    throw new Error('Failed to persist content row')
  },

  async getById(id: string) {
    const db = createServerClient()
    const { data } = await db.from('creator_content').select('*').eq('id', id).maybeSingle()
    return data
  },

  /**
   * Atomically claim a row for the worker: flip pending|failed → fetching.
   * Returns the row if claimed, null if another worker already owns it / it's done.
   */
  async claimForProcessing(id: string, nowIso: string) {
    const db = createServerClient()
    const { data } = await db
      .from('creator_content')
      .update({ fetch_status: 'fetching', last_attempt_at: nowIso })
      .eq('id', id)
      .in('fetch_status', ['pending', 'failed'])
      .select('*')
      .maybeSingle()
    return data
  },

  async markOk(
    id: string,
    fields: {
      posterPath: string | null
      posterSource: PosterSource
      caption: string | null
      authorName: string | null
      posterExpiresAt: string | null
    },
  ) {
    const db = createServerClient()
    await db
      .from('creator_content')
      .update({
        fetch_status: 'ok',
        poster_path: fields.posterPath,
        poster_source: fields.posterSource,
        caption: fields.caption,
        author_name: fields.authorName,
        poster_expires_at: fields.posterExpiresAt,
      })
      .eq('id', id)
  },

  /** Transient failure — bump attempts, leave room for QStash retry. */
  async markFailed(id: string, currentAttempts: number) {
    const db = createServerClient()
    await db
      .from('creator_content')
      .update({ fetch_status: 'failed', attempts: currentAttempts + 1 })
      .eq('id', id)
  },

  /** Provider says deleted/private — terminal, never retried. */
  async markUnavailable(id: string) {
    const db = createServerClient()
    await db.from('creator_content').update({ fetch_status: 'unavailable' }).eq('id', id)
  },

  /** Company page: approved, poster-ready content for a business, pre-sorted. */
  async listActiveForBusiness(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('creator_content')
      .select(READ_SELECT)
      .eq('business_id', businessId)
      .eq('status', 'active')
      .eq('fetch_status', 'ok')
      .order('sort_order', { ascending: true })
    return data ?? []
  },

  /** Creator profile page: a creator's approved content across businesses. */
  async listActiveForCreator(creatorId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('creator_content')
      .select(READ_SELECT)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .eq('fetch_status', 'ok')
      .order('sort_order', { ascending: true })
    return data ?? []
  },

  /** Dashboard moderation queue: poster-ready content awaiting a decision. */
  async listPendingForBusiness(businessId: string) {
    const db = createServerClient()
    const { data } = await db
      .from('creator_content')
      .select(READ_SELECT)
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return data ?? []
  },

  /** Business moderation write — verifies ownership before flipping status. */
  async setStatus(contentId: string, businessId: string, status: ContentStatus) {
    const db = createServerClient()
    const { data } = await db
      .from('creator_content')
      .update({ status })
      .eq('id', contentId)
      .eq('business_id', businessId)
      .select('id')
      .maybeSingle()
    return !!data
  },

  /** Re-validation batch: the N soonest-to-expire OK posters (O(expiring)). */
  async getSoonestToExpire(limit: number) {
    const db = createServerClient()
    const { data } = await db
      .from('creator_content')
      .select('id')
      .eq('fetch_status', 'ok')
      .not('poster_expires_at', 'is', null)
      .order('poster_expires_at', { ascending: true })
      .limit(limit)
    return data ?? []
  },

  /** Re-enqueue: reset an OK row to pending so the worker re-fetches its poster. */
  async resetForRevalidation(id: string) {
    const db = createServerClient()
    await db.from('creator_content').update({ fetch_status: 'pending' }).eq('id', id)
  },
}
