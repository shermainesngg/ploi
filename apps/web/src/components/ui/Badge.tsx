import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const statusColors = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
  cancelled: 'bg-red-50 text-red-700 border-red-200/80',
  declined: 'bg-red-50 text-red-700 border-red-200/80',
  completed: 'bg-bridge-surface text-bridge-secondary border-bridge-border',
  no_show: 'bg-bridge-surface text-bridge-secondary border-bridge-border',
  repeat: 'bg-bridge-accent-wash text-bridge-accent border-bridge-accent-light',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
} as const

const sizes = {
  sm: 'px-2 py-0.5 text-micro',
  md: 'px-2.5 py-1 text-caption',
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: keyof typeof statusColors
  size?: keyof typeof sizes
}

export function Badge({ status, size = 'sm', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-badge border font-semibold',
        statusColors[status],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children ?? status}
    </span>
  )
}
