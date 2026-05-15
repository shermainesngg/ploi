import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  default: 'bg-bridge-card border border-bridge-border/60',
  elevated: 'bg-bridge-card shadow-card',
  colored: 'bg-bridge-surface border border-bridge-border/40',
  interactive:
    'bg-bridge-card border border-bridge-border/60 hover:shadow-card-hover transition-shadow duration-200 cursor-pointer',
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
