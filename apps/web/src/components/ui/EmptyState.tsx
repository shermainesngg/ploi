import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button, type ButtonProps } from './Button'

export interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: ButtonProps['variant']
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="text-bridge-border-strong mb-4">{icon}</div>
      <h3 className="text-title text-bridge-heading mb-1">{title}</h3>
      {description && (
        <p className="text-caption text-bridge-muted max-w-sm">{description}</p>
      )}
      {action && (
        <Button
          variant={action.variant ?? 'primary'}
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
