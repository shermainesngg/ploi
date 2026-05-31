'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui'
import { MediaFrame } from '@/components/ui/MediaFrame'
import { adapterForProvider } from '@/lib/providers'
import type { ContentWithCreator } from '@/lib/types'

const PROVIDER_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
}

export interface ContentPlayerProps {
  open: boolean
  onClose: () => void
  items: ContentWithCreator[]
  startIndex?: number
}

/**
 * Bottom-sheet player (PRD §7.2). Mounts EXACTLY ONE iframe — for the current
 * item only — and unmounts it on close. Swiping changes which sibling that one
 * iframe points at; it never spawns a second. This single-iframe discipline is
 * load-bearing: a regression that mounts a second iframe reintroduces the
 * wall-of-iframes performance problem (covered by ContentPlayer.test).
 */
export function ContentPlayer({ open, onClose, items, startIndex = 0 }: ContentPlayerProps) {
  const [index, setIndex] = useState(startIndex)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (open) setIndex(startIndex)
  }, [open, startIndex])

  if (items.length === 0) return null
  const safeIndex = Math.min(index, items.length - 1)
  const current = items[safeIndex]
  const { content, creator } = current
  const adapter = adapterForProvider(content.provider)
  const embedUrl = adapter && content.externalId ? adapter.getEmbedUrl(content.externalId) : null
  const label = PROVIDER_LABEL[content.provider] ?? content.provider

  const go = (delta: number) =>
    setIndex((i) => (i + delta + items.length) % items.length)

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    touchStartX.current = null
  }

  return (
    <Modal open={open} onClose={onClose} title={creator.displayName}>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <MediaFrame aspectRatio={content.aspectRatio} radius="media" className="bg-black">
          {open && embedUrl ? (
            // The ONE live iframe. key forces a clean remount when the item changes.
            <iframe
              key={content.id}
              src={embedUrl}
              title={content.caption ?? `${label} video`}
              loading="lazy"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-caption text-white/70">
              Unable to load this {label} video
            </div>
          )}
        </MediaFrame>

        {/* Two-tap playback persists for raw TikTok/IG iframes — say so, never look frozen. */}
        <p className="mt-2 text-center text-caption text-bridge-muted">Tap the video to play</p>

        {items.length > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous video"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bridge-surface text-bridge-secondary transition-colors hover:bg-bridge-border"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-caption text-bridge-muted">
              {safeIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next video"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bridge-surface text-bridge-secondary transition-colors hover:bg-bridge-border"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Cheap hedge: gives the creator a real view-credit without losing the customer. */}
        <a
          href={content.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-caption font-medium text-bridge-accent"
        >
          View on {label} <ExternalLink size={13} />
        </a>
      </div>
    </Modal>
  )
}
