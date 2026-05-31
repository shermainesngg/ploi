import { forwardRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type MediaAspectRatio = 'square' | 'portrait' | 'vertical' | 'video'

export interface MediaFrameProps {
  aspectRatio: MediaAspectRatio // 1:1 | 4:5 | 9:16 | 16:9
  radius?: 'media' | 'card' | 'none'
  className?: string
  children: ReactNode
}

const ASPECT: Record<MediaAspectRatio, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
  vertical: 'aspect-[9/16]',
  video: 'aspect-video',
} as const

const RADIUS = {
  media: 'rounded-media',
  card: 'rounded-card',
  none: 'rounded-none',
} as const

/**
 * Dumb, provider-agnostic layout primitive. Reserves the media box so CLS = 0,
 * applies radius + the placeholder background. Knows nothing about images vs
 * video — overlays and embeds are composed as children (PRD §6.1).
 */
export const MediaFrame = forwardRef<HTMLDivElement, MediaFrameProps>(function MediaFrame(
  { aspectRatio, radius = 'media', className, children },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden bg-bridge-media-placeholder',
        ASPECT[aspectRatio],
        RADIUS[radius],
        className,
      )}
    >
      {children}
    </div>
  )
})
