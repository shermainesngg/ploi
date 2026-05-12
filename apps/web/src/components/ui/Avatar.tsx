import { cn } from '@/lib/cn'

const sizeClasses = {
  xs: 'h-6 w-6 text-micro',
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-label',
  lg: 'h-14 w-14 text-title',
} as const

export interface AvatarProps {
  initials: string
  color: string
  size?: keyof typeof sizeClasses
  imageUrl?: string | null
  className?: string
}

export function Avatar({ initials, color, size = 'md', imageUrl, className }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={initials}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
