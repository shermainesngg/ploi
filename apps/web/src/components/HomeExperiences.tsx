'use client'

import { useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { Search, Star, MapPin, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import type { Business } from '@/lib/types'

const ALL = 'All'

export default function HomeExperiences({ businesses }: { businesses: Business[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)

  // Categories derived from real data, each with a representative cover photo
  // for the browse tiles.
  const categories = useMemo(() => {
    const map = new Map<string, Business[]>()
    for (const b of businesses) {
      if (!b.category) continue
      if (!map.has(b.category)) map.set(b.category, [])
      map.get(b.category)!.push(b)
    }
    return map
  }, [businesses])

  const categoryNames = useMemo(() => Array.from(categories.keys()).sort(), [categories])

  // Curated editorial rows (instead of one row per category).
  const recommended = useMemo(
    () => [...businesses].sort((a, b) => b.rating - a.rating).slice(0, 12),
    [businesses],
  )
  // `businesses` arrives newest-first from BusinessService.list().
  const newlyAdded = useMemo(() => businesses.slice(0, 12), [businesses])
  const trending = useMemo(
    () => [...businesses].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 12),
    [businesses],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return businesses.filter((b) => {
      if (category !== ALL && b.category !== category) return false
      if (!q) return true
      return (
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.services.some((s) => s.name.toLowerCase().includes(q))
      )
    })
  }, [businesses, query, category])

  const isFiltering = query.trim() !== '' || category !== ALL

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-bridge-border/40 bg-bridge-card">
        <div className="max-w-5xl mx-auto px-5 pt-16 pb-14 sm:pt-28 sm:pb-20 lg:pt-36 lg:pb-24">
          <span className="inline-block font-display font-bold text-caption tracking-widest text-bridge-accent uppercase mb-5">
            Bangkok · Beauty &amp; Wellness
          </span>

          <h1 className="font-display text-display text-bridge-heading leading-[1.05] tracking-tight max-w-3xl">
            Book the salons, spas &amp; studios locals love<span className="text-bridge-accent">.</span>
          </h1>

          <p className="text-body-lg text-bridge-secondary max-w-xl mt-6 mb-9">
            PLOI is where you discover top-rated beauty &amp; wellness spots — many recommended by the
            creators you follow — and book your appointment in seconds.
          </p>

          {/* Search bar — the primary action */}
          <div className="relative max-w-2xl">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-bridge-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search treatments, places, or areas…"
              className="w-full bg-bridge-bg border border-bridge-border rounded-full pl-14 pr-12 py-4 sm:py-5 text-body sm:text-body-lg text-bridge-heading placeholder:text-bridge-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-bridge-muted hover:bg-bridge-surface transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick category jump-in */}
          {categoryNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="text-caption text-bridge-muted">Popular:</span>
              {categoryNames.slice(0, 4).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="text-label font-semibold text-bridge-secondary bg-bridge-surface hover:bg-bridge-border/60 px-3 py-1.5 rounded-full transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Explore (Fresha-style) ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-10 sm:pt-14">
        {/* Browse by category — image tiles */}
        {categoryNames.length > 0 && (
          <div className="mb-10 sm:mb-14">
            <h2 className="font-display text-title text-bridge-heading mb-4">Browse by category</h2>
            <Scroller>
              {categoryNames.map((c) => {
                const rep = categories.get(c)![0]
                const active = category === c
                return (
                  <CategoryTile
                    key={c}
                    label={c}
                    count={categories.get(c)!.length}
                    business={rep}
                    active={active}
                    onClick={() => setCategory(active ? ALL : c)}
                  />
                )
              })}
            </Scroller>
          </div>
        )}

        {isFiltering ? (
          /* Filtered / searched results → grid */
          <div className="pb-4">
            <div className="flex items-baseline justify-between mb-5">
              <div className="flex items-center gap-2.5 min-w-0">
                {category !== ALL && (
                  <button
                    onClick={() => setCategory(ALL)}
                    aria-label="Back to all"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-bridge-surface text-bridge-secondary hover:bg-bridge-border/60 transition-colors flex-shrink-0"
                  >
                    <ArrowLeft size={15} />
                  </button>
                )}
                <h2 className="font-display text-heading text-bridge-heading truncate">
                  {query.trim()
                    ? `Results for “${query.trim()}”`
                    : category}
                </h2>
              </div>
              <span className="text-caption text-bridge-muted font-data flex-shrink-0">
                {filtered.length} {filtered.length === 1 ? 'place' : 'places'}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-bridge-heading text-body font-semibold">No experiences match that.</p>
                <p className="text-bridge-muted text-caption mt-1">Try a different search or category.</p>
                <button
                  onClick={() => { setQuery(''); setCategory(ALL) }}
                  className="mt-4 text-bridge-accent text-label font-semibold hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                {filtered.map((b, i) => (
                  <AnimateOnScroll key={b.id} delay={Math.min(i, 6) * 60}>
                    <ExperienceCard business={b} />
                  </AnimateOnScroll>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default browse → curated editorial carousels, Fresha-style */
          <div className="space-y-10 sm:space-y-14 pb-4">
            <CarouselRow title="Recommended" subtitle="The highest-rated spots in Bangkok">
              {recommended.map((b) => (
                <CarouselCard key={b.id}><ExperienceCard business={b} /></CarouselCard>
              ))}
            </CarouselRow>

            <CarouselRow title="Newly added" subtitle="Fresh on PLOI">
              {newlyAdded.map((b) => (
                <CarouselCard key={b.id}><ExperienceCard business={b} /></CarouselCard>
              ))}
            </CarouselRow>

            <CarouselRow title="Trending" subtitle="Most booked & reviewed right now">
              {trending.map((b) => (
                <CarouselCard key={b.id}><ExperienceCard business={b} /></CarouselCard>
              ))}
            </CarouselRow>
          </div>
        )}
      </section>
    </>
  )
}

// ── Horizontal scroller with arrow controls (desktop) ──────────────────────────

function Scroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * Math.max(280, ref.current.clientWidth * 0.8), behavior: 'smooth' })
  }
  return (
    <div className="relative group/scroller">
      <div
        ref={ref}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 scroll-smooth snap-x"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>
      {/* Desktop arrows */}
      <button
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 items-center justify-center rounded-full bg-bridge-card border border-bridge-border shadow-md text-bridge-secondary opacity-0 group-hover/scroller:opacity-100 hover:text-bridge-text transition-opacity"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 items-center justify-center rounded-full bg-bridge-card border border-bridge-border shadow-md text-bridge-secondary opacity-0 group-hover/scroller:opacity-100 hover:text-bridge-text transition-opacity"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function CarouselRow({
  title, subtitle, onSeeAll, children,
}: {
  title: string
  subtitle?: string
  onSeeAll?: () => void
  children: React.ReactNode
}) {
  return (
    <AnimateOnScroll>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-heading text-bridge-heading leading-tight">{title}</h2>
          {subtitle && <p className="text-caption text-bridge-muted mt-0.5">{subtitle}</p>}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-label font-semibold text-bridge-accent hover:underline flex-shrink-0 ml-4"
          >
            See all
          </button>
        )}
      </div>
      <Scroller>{children}</Scroller>
    </AnimateOnScroll>
  )
}

function CarouselCard({ children }: { children: React.ReactNode }) {
  return <div className="snap-start flex-shrink-0 w-56 sm:w-64">{children}</div>
}

// ── Category tile (image background) ───────────────────────────────────────────

function CategoryTile({
  label, count, business, active, onClick,
}: {
  label: string
  count: number
  business: Business
  active: boolean
  onClick: () => void
}) {
  const [from, to] = business.coverGradient
  return (
    <button
      onClick={onClick}
      className={`snap-start flex-shrink-0 w-32 sm:w-40 text-left rounded-card overflow-hidden relative aspect-[4/3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent transition-transform hover:-translate-y-0.5 ${
        active ? 'ring-2 ring-bridge-accent' : ''
      }`}
    >
      {business.coverPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={business.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-2.5 left-3 right-3">
        <p className="font-display text-white font-bold text-label leading-tight drop-shadow-sm line-clamp-2">{label}</p>
        <p className="text-white/75 text-micro font-data mt-0.5">{count} {count === 1 ? 'place' : 'places'}</p>
      </div>
    </button>
  )
}

// ── Business card (Fresha-style) ───────────────────────────────────────────────

function ExperienceCard({ business }: { business: Business }) {
  const [from, to] = business.coverGradient
  const fromPrice = business.services?.length
    ? Math.min(...business.services.map((s) => s.price))
    : null

  return (
    <Link
      href={`/shop/${business.slug}`}
      className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2 rounded-card"
    >
      <Card variant="interactive" className="p-0 overflow-hidden h-full">
        <div className="relative aspect-[4/3]">
          {business.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
          )}
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-white/90 backdrop-blur-sm text-bridge-secondary text-micro px-2.5 py-1 rounded-badge font-medium border-l-2 border-bridge-accent">
              {business.category}
            </span>
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-display font-bold text-bridge-heading text-body leading-tight line-clamp-1">
            {business.name}
          </h3>

          {/* Rating row */}
          {business.rating > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Star size={12} className="fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="font-data font-bold text-bridge-heading text-caption">{business.rating.toFixed(1)}</span>
              {business.reviewCount > 0 && (
                <span className="text-bridge-muted text-caption font-data">({business.reviewCount})</span>
              )}
            </div>
          )}

          {business.location && (
            <p className="text-bridge-muted text-caption mt-1 flex items-center gap-1 truncate">
              <MapPin size={11} className="flex-shrink-0" />
              <span className="truncate">{business.location.split(',')[0]}</span>
            </p>
          )}

          {fromPrice !== null && (
            <p className="mt-2 pt-2 border-t border-bridge-border/50 text-caption text-bridge-secondary">
              from <span className="text-bridge-accent font-data font-bold">฿{fromPrice.toLocaleString()}</span>
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
