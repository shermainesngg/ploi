'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { ContentEmbed } from '@/components/ui/ContentEmbed'
import { ContentPlayer } from '@/components/ContentPlayer'
import { resolvePosterUrl } from '@/lib/poster'
import type { ContentWithCreator } from '@/lib/types'

const INITIAL_VISIBLE = 20 // facades are cheap — comfortable headroom (PRD §7.1)
const EAGER_POSTERS = 4 // load posters above the fold eagerly; lazy-load the rest

export interface ContentCarouselProps {
  items: ContentWithCreator[]
  /** Hide the creator chip when the carousel already lives on that creator's page. */
  showCreatorChip?: boolean
  className?: string
}

/**
 * Horizontal swimlane of 9:16 (and 16:9) facade cards — peeks the next card to
 * signal swipe. NOT a grid: two vertical tiles on a 390px phone are unreadable
 * (PRD §7.1). Each card carries the creator chip (Discovery Loop) and opens the
 * single-iframe bottom-sheet player on tap.
 */
export function ContentCarousel({ items, showCreatorChip = true, className }: ContentCarouselProps) {
  const [playerOpen, setPlayerOpen] = useState(false)
  const [startIndex, setStartIndex] = useState(0)
  const [visible, setVisible] = useState(INITIAL_VISIBLE)

  if (items.length === 0) return null

  const shown = items.slice(0, visible)

  const open = (i: number) => {
    setStartIndex(i)
    setPlayerOpen(true)
  }

  return (
    <div className={className}>
      <div className="-mx-card-padding flex snap-x snap-mandatory gap-3 overflow-x-auto px-card-padding pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((item, i) => {
          const { content, creator } = item
          return (
            <div
              key={content.id}
              className="w-[60%] shrink-0 snap-start sm:w-[220px]"
            >
              <ContentEmbed
                provider={content.provider as 'tiktok' | 'instagram' | 'youtube'}
                externalId={content.externalId ?? ''}
                posterSrc={resolvePosterUrl(content.posterPath)}
                caption={content.caption}
                authorName={content.authorName}
                aspectRatio={content.aspectRatio}
                priority={i < EAGER_POSTERS}
                onOpen={() => open(i)}
              >
                {showCreatorChip && (
                  <Link
                    href={`/${creator.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 rounded-badge bg-black/45 py-1 pl-1 pr-2 backdrop-blur-sm"
                  >
                    <Avatar
                      initials={creator.avatarInitials}
                      color={creator.avatarColor}
                      size="xs"
                    />
                    <span className="text-micro font-semibold text-white">{creator.handle}</span>
                  </Link>
                )}
              </ContentEmbed>
            </div>
          )
        })}
      </div>

      {visible < items.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + INITIAL_VISIBLE)}
          className="mt-2 w-full rounded-button border border-bridge-border py-2 text-label font-semibold text-bridge-secondary transition-colors hover:bg-bridge-surface"
        >
          Load more
        </button>
      )}

      <ContentPlayer
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        items={items}
        startIndex={startIndex}
      />
    </div>
  )
}
