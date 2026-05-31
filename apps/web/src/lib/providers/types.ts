import type { AspectRatio, MediaKind, Provider } from '@/lib/types'

/**
 * A provider adapter is a plain object (no React) describing how to recognize,
 * parse, embed, and fetch metadata for one social platform. Adding a provider =
 * adding one file + registering it. See PRD-COMPANY-PAGE-EMBEDS §6.3.
 */
export interface ProviderAdapter {
  id: Provider

  /** True if this adapter owns the given content URL. */
  matches(url: string): boolean

  /**
   * Pull the stable external id + media shape out of a URL.
   * Returns null when the URL matches the host but isn't a parseable
   * permalink (e.g. a short vm.tiktok.com link that must be resolved first).
   */
  parse(url: string): { externalId: string; mediaKind: MediaKind; aspectRatio: AspectRatio } | null

  /** How posters are sourced for this provider. */
  poster: 'oembed' | 'predictable' | 'og' | 'upload' | 'branded'

  /** Raw iframe URL for the bottom-sheet player — NEVER an SDK. */
  getEmbedUrl(externalId: string): string

  defaultAspectRatio: AspectRatio

  /**
   * Worker-side metadata fetch (oEmbed / predictable URL). Optional: providers
   * with predictable posters (YouTube) don't need a network call.
   */
  fetchMeta?(url: string, externalId: string): Promise<ProviderMeta>
}

export interface ProviderMeta {
  /** Remote poster URL to download + self-host. Absent for predictable/upload posters. */
  thumbnailUrl?: string
  /** Predictable poster URL we serve directly (no download). */
  posterUrl?: string
  caption?: string
  authorName?: string
  /** Provider reported the content as deleted/private → mark unavailable, do not retry. */
  unavailable?: boolean
}
