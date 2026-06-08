import { Skeleton } from '@/components/ui/Skeleton'

// Page-level loading skeletons. Rendered instantly by each route's `loading.tsx`
// (an App Router Suspense boundary) while the server component fetches data, so
// navigation swaps to a structural placeholder of the destination instead of a
// blank flash. The persistent NavBar in the root layout stays mounted.

function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={`rounded-card ${className ?? ''}`} />
}

/** Shop booking page — hero photo, title, attribution bar, service rows. */
export function ShopPageSkeleton() {
  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto">
        {/* Hero photo */}
        <Skeleton className="w-full aspect-[16/10] rounded-none" />

        <div className="px-4">
          {/* Title + meta */}
          <div className="mt-5 space-y-2.5">
            <Skeleton className="h-7 w-2/3 rounded" />
            <Skeleton className="h-4 w-2/5 rounded" />
          </div>

          {/* Attribution / creator bar */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-bridge-border/60 p-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/4 rounded" />
            </div>
          </div>

          {/* Services heading */}
          <Skeleton className="h-3 w-28 rounded mt-8 mb-4" />

          {/* Service cards */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-card border border-bridge-border/60 p-4">
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/4 rounded" />
                </div>
                <Skeleton className="h-9 w-20 rounded-button" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Creator profile — centred avatar, name, bio, then a grid of business cards. */
export function CreatorProfileSkeleton() {
  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="px-5 pt-16 pb-12 sm:pt-24 max-w-lg mx-auto flex flex-col items-center">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-6 w-40 rounded mt-5" />
        <Skeleton className="h-4 w-64 rounded mt-3" />
        <Skeleton className="h-4 w-48 rounded mt-2" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Dashboard — stat tiles, then a list. Used for both creator & business dashboards. */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-1/2 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card border border-bridge-border/60 p-card-padding space-y-3">
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-6 w-2/3 rounded" />
            </div>
          ))}
        </div>

        {/* List */}
        <Skeleton className="h-3 w-28 rounded mt-8 mb-3" />
        <div className="rounded-2xl border border-bridge-border/60 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-bridge-border/40 last:border-b-0">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Simple list page (bookings, search results). */
export function ListSkeleton() {
  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Skeleton className="h-7 w-1/3 rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-card border border-bridge-border/60 p-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Neutral fallback for async pages without a bespoke skeleton. */
export function GenericSkeleton() {
  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto px-5 py-12 space-y-6">
        <Skeleton className="h-7 w-1/2 rounded" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    </div>
  )
}

/** Home — hero band + category tiles + results grid. */
export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-bridge-bg">
      {/* Hero */}
      <div className="border-b border-bridge-border/40 bg-bridge-card">
        <div className="max-w-5xl mx-auto px-5 pt-16 pb-14 sm:pt-28 sm:pb-20">
          <Skeleton className="h-4 w-40 rounded mb-5" />
          <Skeleton className="h-10 w-3/4 rounded mb-3" />
          <Skeleton className="h-10 w-1/2 rounded mb-6" />
          <Skeleton className="h-5 w-2/3 rounded mb-8" />
          <Skeleton className="h-14 w-full max-w-2xl rounded-full" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-10 sm:pt-14">
        <Skeleton className="h-5 w-44 rounded mb-4" />
        <div className="flex gap-3 mb-10 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-36 h-24 rounded-card flex-shrink-0" />
          ))}
        </div>
        <Skeleton className="h-6 w-52 rounded mb-5" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      </div>
    </div>
  )
}
