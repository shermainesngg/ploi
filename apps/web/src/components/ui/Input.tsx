'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-label text-bridge-text">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bridge-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-input border border-bridge-border bg-bridge-card px-input-x py-input-y text-body text-bridge-text',
              'placeholder:text-bridge-muted/60',
              'focus:outline-none focus:ring-2 focus:ring-bridge-accent/40 focus:border-bridge-accent',
              'disabled:opacity-50 disabled:bg-bridge-surface',
              'transition-shadow duration-150',
              icon && 'pl-10',
              error && 'border-red-400 focus:ring-red-500/30',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-caption text-red-600">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-label text-bridge-text">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-input border border-bridge-border bg-bridge-card px-input-x py-input-y text-body text-bridge-text',
            'placeholder:text-bridge-muted/60',
            'focus:outline-none focus:ring-2 focus:ring-bridge-accent/40 focus:border-bridge-accent',
            'disabled:opacity-50 disabled:bg-bridge-surface',
            'transition-shadow duration-150 resize-none',
            error && 'border-red-400 focus:ring-red-500/30',
            className,
          )}
          {...props}
        />
        {error && <p className="text-caption text-red-600">{error}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
