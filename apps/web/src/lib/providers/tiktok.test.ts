import { describe, it, expect } from 'vitest'
import { tiktokAdapter } from './tiktok'
import { adapterForUrl, adapterForProvider } from './index'
import { normalizeContentUrl, contentUrlHash } from '@/lib/content-url'

describe('tiktokAdapter', () => {
  it('matches canonical and short TikTok URLs', () => {
    expect(tiktokAdapter.matches('https://www.tiktok.com/@ava/video/7234567890123456789')).toBe(true)
    expect(tiktokAdapter.matches('https://vm.tiktok.com/ZMabc123/')).toBe(true)
    expect(tiktokAdapter.matches('https://youtube.com/watch?v=x')).toBe(false)
  })

  it('parses the numeric id and media kind from a permalink', () => {
    const r = tiktokAdapter.parse('https://www.tiktok.com/@ava/video/7234567890123456789?lang=en')
    expect(r).toEqual({ externalId: '7234567890123456789', mediaKind: 'video', aspectRatio: 'vertical' })
  })

  it('treats /photo/ posts as image media', () => {
    const r = tiktokAdapter.parse('https://www.tiktok.com/@ava/photo/7234567890123456789')
    expect(r?.mediaKind).toBe('image')
  })

  it('returns null for short links that need resolving', () => {
    expect(tiktokAdapter.parse('https://vm.tiktok.com/ZMabc123/')).toBeNull()
  })

  it('builds a raw embed URL (no SDK)', () => {
    expect(tiktokAdapter.getEmbedUrl('123')).toBe('https://www.tiktok.com/embed/v2/123')
  })
})

describe('registry', () => {
  it('resolves by URL and by id', () => {
    expect(adapterForUrl('https://www.tiktok.com/@ava/video/1')?.id).toBe('tiktok')
    expect(adapterForUrl('https://example.com')).toBeNull()
    expect(adapterForProvider('tiktok')?.id).toBe('tiktok')
    expect(adapterForProvider('youtube')).toBeNull()
  })
})

describe('content-url', () => {
  it('drops query + fragment and trailing slash', () => {
    expect(normalizeContentUrl('https://www.TikTok.com/@ava/video/1/?lang=en#x')).toBe(
      'https://www.tiktok.com/@ava/video/1',
    )
  })

  it('hashes two share-param variants of the same post identically', () => {
    const a = contentUrlHash('https://www.tiktok.com/@ava/video/1?lang=en')
    const b = contentUrlHash('https://www.tiktok.com/@ava/video/1?_r=1&share_id=2')
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })
})
