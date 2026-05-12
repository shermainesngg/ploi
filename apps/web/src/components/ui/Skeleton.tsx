import { cn } from '@/lib/cn'

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-card bg-bridge-border/60 animate-shimmer',
        'bg-gradient-to-r from-bridge-border/60 via-bridge-surface/60 to-bridge-border/60 bg-[length:200%_100%]',
        className,
      )}
    />
  )
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full rounded', className)} />
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-card border border-bridge-border/60 p-card-padding space-y-3', className)}>
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
      <Skeleton className="h-3 w-2/3 rounded" />
    </div>
  )
}
