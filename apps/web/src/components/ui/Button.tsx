'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-bridge-accent text-white hover:bg-bridge-accent-dark active:scale-[0.98]',
  secondary:
    'border border-bridge-border-strong text-bridge-text hover:bg-bridge-surface active:scale-[0.98]',
  ghost:
    'text-bridge-secondary hover:bg-bridge-surface active:scale-[0.98]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
} as const

const sizes = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-10 px-4 text-label',
  lg: 'h-12 px-6 text-body',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-button font-semibold cursor-pointer transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
