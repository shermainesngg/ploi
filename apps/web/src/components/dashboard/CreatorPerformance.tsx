'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Inbox, MousePointerClick, Play, Repeat } from 'lucide-react'
import { resolvePosterUrl } from '@/lib/poster'
import type { ContentWithCreator } from '@/lib/types'
import type { CreatorBookingFeedItem } from '@/services/dashboard.service'

function formatPrice(thb: number) {
  return `฿${thb.toLocaleString()}`
}

const STATUS_BADGE: Record<CreatorBookingFeedItem['status'], string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-700',
}

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled'
type TypeFilter = 'all' | 'new' | 'repeat'
type RangeFilter = 'all' | '30' | '90'

interface Filters {
  status: StatusFilter
  type: TypeFilter
  range: RangeFilter
  videoId: string | null
}

const DEFAULT_FILTERS: Filters = { status: 'all', type: 'all', range: 'all', videoId: null }

interface Props {
  businessSlug: string
  creatorSlug: string
  creatorHandle: string
  videos: ContentWithCreator[]
  initialItems: CreatorBookingFeedItem[]
  initialHasMore: boolean
  pageSize: number
}

export function CreatorPerformance({
  businessSlug, creatorSlug, creatorHandle, videos, initialItems, initialHasMore, pageSize,
}: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [items, setItems] = useState<CreatorBookingFeedItem[]>(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // True while the visible feed still reflects the server-rendered default page.
  const isDefault =
    filters.status === 'all' && filters.type === 'all' && filters.range === 'all' && filters.videoId === null
  const pristine = useRef(true)

  const fetchPage = useCallback(
    async (f: Filters, offset: number, append: boolean) => {
      setLoading(true)
      setError(false)
      try {
        const qs = new URLSearchParams({ offset: String(offset), limit: String(pageSize) })
        if (f.status !== 'all') qs.set('status', f.status)
        if (f.type !== 'all') qs.set('type', f.type)
        if (f.range !== 'all') qs.set('range', f.range)
        if (f.videoId) qs.set('video', f.videoId)
        const res = await fetch(
          `/api/dashboard/business/${encodeURIComponent(businessSlug)}/creators/${encodeURIComponent(creatorSlug)}/bookings?${qs}`,
        )
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        setItems((prev) => (append ? [...prev, ...data.items] : data.items))
        setHasMore(!!data.hasMore)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [businessSlug, creatorSlug, pageSize],
  )

  // Refetch from the top whenever filters change — except the very first render,
  // which already shows the server-provided default page.
  useEffect(() => {
    if (pristine.current) {
      pristine.current = false
      if (isDefault) return
    }
    fetchPage(filters, 0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const setVideoFilter = (id: string) =>
    setFilters((f) => ({ ...f, videoId: f.videoId === id ? null : id }))

  const activeVideo = filters.videoId ? videos.find((v) => v.content.id === filters.videoId) : null

  return (
    <div>
      {/* ── Their videos (tap a tile to filter the feed below) ── */}
      {videos.length > 0 && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-label text-bridge-muted uppercase tracking-widest">
              Their videos for your business
            </h2>
            <span className="text-micro text-bridge-muted/70">Tap to filter bookings</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {videos.map(({ content, stats }) => {
              const poster = resolvePosterUrl(content.posterPath)
              const bookings = stats?.bookingCount ?? 0
              const selected = filters.videoId === content.id
              return (
                <button
                  key={content.id}
                  type="button"
                  onClick={() => setVideoFilter(content.id)}
                  aria-pressed={selected}
                  className={`relative block aspect-[9/16] rounded-media overflow-hidden bg-bridge-media-placeholder group text-left ring-offset-2 ring-offset-bridge-bg transition-shadow ${
                    selected ? 'ring-2 ring-bridge-accent' : 'ring-0'
                  }`}
                >
                  {poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt={content.caption ?? ''} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-overlay-scrim" />
                  {/* Per-video taps */}
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-micro font-medium text-white backdrop-blur-sm">
                    <MousePointerClick size={10} />
                    <span className="font-data">{content.clickCount}</span>
                  </span>
                  {/* Per-video bookings driven */}
                  {bookings > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-bridge-accent px-1.5 py-0.5 text-micro font-semibold text-white">
                      <Inbox size={10} />
                      <span className="font-data">{bookings}</span>
                    </span>
                  )}
                  {/* Open the actual post without triggering the filter */}
                  <a
                    href={content.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
                    aria-label="Open video"
                  >
                    <ExternalLink size={11} />
                  </a>
                  {content.caption && (
                    <p className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-2 pt-5 text-micro font-medium text-white/95 pointer-events-none">
                      {content.caption}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Bookings feed with filters ── */}
      <section className="mt-8">
        <h2 className="text-label text-bridge-muted uppercase tracking-widest mb-3">
          Bookings via {creatorHandle}
        </h2>

        {/* Filter rows */}
        <div className="space-y-2 mb-4">
          <ChipRow
            options={[['all', 'All'], ['new', 'New'], ['repeat', 'Repeat']]}
            value={filters.type}
            onChange={(v) => setFilters((f) => ({ ...f, type: v as TypeFilter }))}
          />
          <ChipRow
            options={[['all', 'Any status'], ['confirmed', 'Confirmed'], ['pending', 'Pending'], ['cancelled', 'Cancelled']]}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v as StatusFilter }))}
          />
          <ChipRow
            options={[['all', 'All time'], ['30', '30 days'], ['90', '90 days']]}
            value={filters.range}
            onChange={(v) => setFilters((f) => ({ ...f, range: v as RangeFilter }))}
          />
          {activeVideo && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, videoId: null }))}
              className="inline-flex items-center gap-1.5 rounded-full bg-bridge-accent/10 text-bridge-accent border border-bridge-accent/30 px-2.5 py-1 text-micro font-semibold"
            >
              <Play size={10} className="fill-current" />
              <span className="max-w-[160px] truncate">{activeVideo.content.caption ?? 'Selected video'}</span>
              <span aria-hidden className="ml-0.5">✕</span>
            </button>
          )}
        </div>

        {/* Feed */}
        {error ? (
          <EmptyCard title="Couldn’t load bookings." sub="Check your connection and try again." />
        ) : items.length === 0 && !loading ? (
          <EmptyCard
            title={isDefault ? 'No bookings from this creator yet.' : 'No bookings match these filters.'}
            sub={isDefault ? 'Bookings made through their link will appear here.' : 'Try clearing a filter.'}
          />
        ) : (
          <div className="space-y-2">
            {items.map((b) => (
              <div key={b.id} className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-bridge-heading text-body truncate">{b.serviceName}</p>
                    <p className="text-bridge-muted text-caption mt-0.5">
                      {b.customerName} · {b.date} · {b.time}
                    </p>
                    {b.isRepeat && (
                      <p className="text-bridge-muted text-micro mt-1 flex items-center gap-1">
                        <Repeat size={10} /> Returning customer
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-micro font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status]}`}>
                      {b.status}
                    </span>
                    <p className="font-data text-body font-bold text-bridge-heading mt-1.5">{formatPrice(b.price)}</p>
                    {b.commissionRate != null && b.status !== 'cancelled' && (
                      <p className="font-data text-micro text-bridge-accent mt-0.5">
                        {formatPrice(Math.round(b.price * b.commissionRate))} commission
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !error && (
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchPage(filters, items.length, true)}
            className="mt-3 w-full rounded-button border border-bridge-border py-2.5 text-label font-semibold text-bridge-secondary transition-colors hover:bg-bridge-surface disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </section>
    </div>
  )
}

function ChipRow({
  options, value, onChange,
}: {
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, label]) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1 text-caption font-semibold transition-colors ${
              active
                ? 'bg-bridge-ink text-bridge-ink-foreground'
                : 'bg-bridge-card border border-bridge-border text-bridge-secondary hover:bg-bridge-surface'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function EmptyCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-8 text-center">
      <p className="text-bridge-muted text-body">{title}</p>
      <p className="text-bridge-muted/70 text-caption mt-1">{sub}</p>
    </div>
  )
}
