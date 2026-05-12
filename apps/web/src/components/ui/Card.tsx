import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  default: 'bg-white border border-bridge-border/60',
  elevated: 'bg-white shadow-card',
  colored: 'bg-bridge-surface border border-bridge-border/40',
  interactive:
    'bg-white border border-bridge-border/60 hover:shadow-card-hover motion-safe:hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
} as const

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-card p-card-padding', variants[variant], className)}
        {...props}
      />
    )
  },
)
Card.displayName = 'Card'
