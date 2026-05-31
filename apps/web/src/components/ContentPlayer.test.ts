// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createElement as h } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ContentPlayer } from './ContentPlayer'
import type { ContentWithCreator } from '@/lib/types'

// Mock framer-motion so AnimatePresence mounts/unmounts synchronously (no exit
// animation lingering), letting us assert unmount-on-close deterministically.
// JSX isn't configured for the test transform, so this file uses createElement.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: unknown }) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  motion: new Proxy({}, { get: (_t, tag: string) => (props: any) => h(tag, props) }),
}))

function makeItem(id: string, externalId: string): ContentWithCreator {
  return {
    content: {
      id,
      linkId: 'l1',
      creatorId: 'c1',
      businessId: 'b1',
      provider: 'tiktok',
      contentUrl: `https://www.tiktok.com/@ava/video/${externalId}`,
      externalId,
      urlHash: id,
      mediaKind: 'video',
      aspectRatio: 'vertical',
      posterSource: 'oembed',
      posterPath: null,
      caption: 'cap',
      authorName: 'Ava',
      fetchStatus: 'ok',
      attempts: 0,
      lastAttemptAt: null,
      posterExpiresAt: null,
      status: 'active',
      sortOrder: 0,
      createdAt: null,
    },
    creator: { slug: 'ava', handle: '@ava', displayName: 'Ava', avatarInitials: 'A', avatarColor: '#000' },
  }
}

const items = [makeItem('id1', '111'), makeItem('id2', '222')]

afterEach(cleanup)

describe('ContentPlayer single-iframe discipline', () => {
  it('mounts exactly one iframe when open', () => {
    render(h(ContentPlayer, { open: true, items, onClose: () => {}, startIndex: 0 }))
    const iframes = document.querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
    expect(iframes[0].getAttribute('src')).toBe('https://www.tiktok.com/embed/v2/111')
  })

  it('keeps exactly one iframe after swiping to the next video', () => {
    render(h(ContentPlayer, { open: true, items, onClose: () => {}, startIndex: 0 }))
    fireEvent.click(screen.getByLabelText('Next video'))
    const iframes = document.querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
    expect(iframes[0].getAttribute('src')).toBe('https://www.tiktok.com/embed/v2/222')
  })

  it('unmounts the iframe on close (no wall-of-iframes regression)', () => {
    const { rerender } = render(
      h(ContentPlayer, { open: true, items, onClose: () => {}, startIndex: 0 }),
    )
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    rerender(h(ContentPlayer, { open: false, items, onClose: () => {}, startIndex: 0 }))
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })
})
