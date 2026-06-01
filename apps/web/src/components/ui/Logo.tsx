import { cn } from '@/lib/cn'

/**
 * PLOI P-gem mark — the initial "P" merged with a faceted gem counter.
 * Represents hidden value, discovery, and precision. One color, scales to any size.
 * Uses currentColor so it inverts with the theme (ink on light, warm white on dark).
 */
export function PloiMark({ className, size = 24 }: { className?: string; size?: number }) {
  // Natural artwork is portrait (89 × 122 viewBox); `size` drives the height
  // and the width follows the aspect ratio so the mark never distorts.
  const aspect = 89 / 122
  return (
    <svg
      width={size * aspect}
      height={size}
      viewBox="-5 -5 89 122"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* The P stem + faceted gem counter, as a single even-odd path */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 6 Q0 0 6 0 L50 0 C66 0 79 16 79 38 C79 57 68 70 52 76 L13 76 L13 112 L0 112 Z M38 8 L64 24 L64 50 L38 70 L12 50 L12 24 Z"
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
