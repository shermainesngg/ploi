import type { ProviderAdapter, ProviderMeta } from './types'

// Canonical permalink: https://www.tiktok.com/@handle/video/{numericId}
// Also accept photo posts: https://www.tiktok.com/@handle/photo/{numericId}
const PERMALINK = /tiktok\.com\/@[^/]+\/(video|photo)\/(\d+)/i
// Short links (vm.tiktok.com/XXXX, vt.tiktok.com/XXXX) can't be parsed without
// an HTTP resolve — accepted by matches() so the URL is stored, but parse()
// returns null and the worker resolves the real id via oEmbed.
const SHORT = /(vm|vt)\.tiktok\.com\//i

export const tiktokAdapter: ProviderAdapter = {
  id: 'tiktok',

  matches(url) {
    return /tiktok\.com\//i.test(url)
  },

  parse(url) {
    const m = url.match(PERMALINK)
    if (!m) return null
    const kind = m[1].toLowerCase()
    return {
      externalId: m[2],
      mediaKind: kind === 'photo' ? 'image' : 'video',
      aspectRatio: 'vertical',
    }
  },

  poster: 'oembed',

  // Raw embed iframe — no embed.js. v2 is the current TikTok embed surface.
  getEmbedUrl(externalId) {
    return `https://www.tiktok.com/embed/v2/${externalId}`
  },

  defaultAspectRatio: 'vertical',

  // Keyless oEmbed: the only way to get a real TikTok thumbnail (can't derive
  // from the id). Self-hosted downstream to kill thumbnail-URL rot.
  async fetchMeta(url): Promise<ProviderMeta> {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const res = await fetch(endpoint, {
      headers: { 'User-Agent': 'BridgeBot/1.0 (+https://bridge.app)' },
    })

    // TikTok returns 404 for deleted/private posts → non-retryable.
    if (res.status === 404) return { unavailable: true }
    if (!res.ok) throw new Error(`TikTok oEmbed ${res.status}`)

    const data = (await res.json()) as {
      thumbnail_url?: string
      title?: string
      author_name?: string
    }

    if (!data.thumbnail_url) {
      // No thumbnail and a 200 usually means the embed is restricted.
      return { unavailable: true }
    }

    return {
      thumbnailUrl: data.thumbnail_url,
      caption: data.title || undefined,
      authorName: data.author_name || undefined,
    }
  },
}

export { SHORT as TIKTOK_SHORT_LINK }
