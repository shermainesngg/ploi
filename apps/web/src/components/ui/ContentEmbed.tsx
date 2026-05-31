'use client'

import Image from 'next/image'
import { Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { MediaFrame, type MediaAspectRatio } from './MediaFrame'

export interface ContentEmbedProps {
  provider: 'tiktok' | 'instagram' | 'youtube'
  externalId: string
  posterSrc?: string | null // host-agnostic key already resolved to a URL
  caption?: string | null
  authorName?: string | null
  aspectRatio?: MediaAspectRatio
  /** Opens the bottom-sheet player. */
  onOpen?: () => void
  /** Composed overlay — e.g. the creator chip. Rendered above the scrim, clickable. */
  children?: ReactNode
  priority?: boolean
  sizes?: string
  className?: string
}

const PROVIDER_LABEL: Record<ContentEmbedProps['provider'], string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
}

/**
 * Facade leaf (PRD §6.2): poster + play affordance. NO SDK, NO iframe at rest.
 * Tapping calls `onOpen`, which mounts exactly one iframe in the bottom-sheet
 * player. Avoids pre-tap third-party tracking (PDPA-friendly) and keeps the
 * page light on mid-range Android.
 */
export function ContentEmbed({
  provider,
  posterSrc,
  caption,
  authorName,
  aspectRatio = 'vertical',
  onOpen,
  children,
  priority = false,
  sizes = '(max-width: 768px) 60vw, 220px',
  className,
}: ContentEmbedProps) {
  return (
    <MediaFrame aspectRatio={aspectRatio} radius="media" className={cn('group', className)}>
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt={caption ?? `${PROVIDER_LABEL[provider]} video${authorName ? ` by ${authorName}` : ''}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-bridge-muted">
          <span className="text-micro uppercase tracking-wide">{PROVIDER_LABEL[provider]}</span>
        </div>
      )}

      {/* Scrim keeps overlay text legible over any poster (theme-independent token). */}
      <div className="pointer-events-none absolute inset-0 bg-overlay-scrim" />

      {/* Primary tap target — a real focusable button (a11y), covers the frame. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Play ${PROVIDER_LABEL[provider]} video`}
        className="absolute inset-0 flex items-center justify-center focus:outline-none"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-bridge-heading shadow-card transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
          <Play size={22} className="ml-0.5 fill-current" />
        </span>
      </button>

      {caption && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 px-3 pb-3 pt-6 text-caption font-medium text-white/95">
          {caption}
        </p>
      )}

      {/* Composed overlay (creator chip etc.) — above the scrim + caption, clickable. */}
      {children && <div className="absolute left-2 top-2 z-10">{children}</div>}
    </MediaFrame>
  )
}
