import { cn } from '@/lib/cn'

/**
 * PLOI P-gem mark — the initial "P" merged with a faceted gem counter.
 * Represents hidden value, discovery, and precision. One color, scales to any size.
 * Uses currentColor so it inverts with the theme (ink on light, warm white on dark).
 */
export function PloiMark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* Stem of the P */}
      <rect x="6" y="3.5" width="5.4" height="25" rx="0.6" />
      {/* Bowl as a faceted gem (outer diamond with a cut-out counter) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 2 L26 12 L16 22 L6 12 Z M16 7.6 L20.4 12 L16 16.4 L11.6 12 Z"
      />
    </svg>
  )
}

/**
 * "Powered by PLOI" badge — the invisible-brand signature for pages where the
 * business is the star (Shop Booking page). Quiet, monochrome, recedes by default.
 */
export function PoweredByPloi({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-bridge-muted text-[11px] font-medium',
        className,
      )}
    >
      <span>Powered by</span>
      <PloiMark size={13} className="text-bridge-secondary" />
      <span className="font-display font-extrabold tracking-tight text-bridge-secondary">PLOI</span>
    </span>
  )
}

/**
 * Full PLOI lockup — P-gem mark + wordmark. Inherits text color from context.
 * `mark` renders the gem only (favicon / compact contexts).
 */
export function PloiLogo({
  className,
  size = 22,
  variant = 'full',
}: {
  className?: string
  size?: number
  variant?: 'full' | 'mark'
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-bridge-heading', className)}>
      <PloiMark size={size} />
      {variant === 'full' && (
        <span
          className="font-display font-extrabold tracking-tight leading-none"
          style={{ fontSize: size * 0.86 }}
        >
          PLOI
        </span>
      )}
    </span>
  )
}
