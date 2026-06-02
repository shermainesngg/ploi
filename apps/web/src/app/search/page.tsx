'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, MapPin, X } from 'lucide-react'

type SearchKind = 'businesses' | 'creators'

interface BusinessResult {
  slug: string
  name: string
  category: string
  location: string
  coverGradient: [string, string]
  coverPhotoUrl: string | null
}

interface CreatorResult {
  slug: string
  handle: string
  displayName: string
  bio: string
  avatarInitials: string
  avatarColor: string
  avatarUrl: string | null
}

const PLACEHOLDER: Record<SearchKind, string> = {
  businesses: 'Search salons, spas, studios…',
  creators: 'Search creators by name or @handle…',
}

export default function SearchPage() {
  const [kind, setKind] = useState<SearchKind>('businesses')
  const [query, setQuery] = useState('')
  const [businessResults, setBusinessResults] = useState<BusinessResult[]>([])
  const [creatorResults, setCreatorResults] = useState<CreatorResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search against the active endpoint. Switching kind re-runs it.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setBusinessResults([])
      setCreatorResults([])
      setSearching(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const endpoint =
          kind === 'businesses' ? '/api/businesses/search' : '/api/creators/search'
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (kind === 'businesses') {
          setBusinessResults(Array.isArray(data) ? data : [])
        } else {
          setCreatorResults(Array.isArray(data) ? data : [])
        }
      } catch {
        setBusinessResults([])
        setCreatorResults([])
      } finally {
        setSearching(false)
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, kind])

  const hasQuery = query.trim().length > 0
  const results = kind === 'businesses' ? businessResults : creatorResults

  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        <h1 className="font-display text-heading text-bridge-heading mb-5">Search</h1>

        {/* Kind toggle — separate searches for businesses and creators */}
        <div className="flex gap-1 bg-bridge-surface rounded-xl p-1 mb-4">
          {(['businesses', 'creators'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                kind === k
                  ? 'bg-bridge-card text-bridge-heading shadow-sm'
                  : 'text-bridge-muted hover:text-bridge-text'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bridge-muted pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDER[kind]}
            autoFocus
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-bridge-card border border-bridge-border/60 text-bridge-text text-sm placeholder:text-bridge-muted focus:outline-none focus:border-bridge-accent transition-colors"
          />
          {hasQuery && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-bridge-muted hover:bg-bridge-surface transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results */}
        {!hasQuery ? (
          <p className="text-bridge-muted text-sm text-center py-16">
            {kind === 'businesses'
              ? 'Find a salon, spa, or studio to book.'
              : 'Find a creator and see what they recommend.'}
          </p>
        ) : searching && results.length === 0 ? (
          <p className="text-bridge-muted text-sm text-center py-16">Searching…</p>
        ) : results.length === 0 ? (
          <p className="text-bridge-muted text-sm text-center py-16">
            No {kind} found for “{query.trim()}”.
          </p>
        ) : kind === 'businesses' ? (
          <div className="space-y-3">
            {businessResults.map((b) => (
              <BusinessRow key={b.slug} business={b} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {creatorResults.map((c) => (
              <CreatorRow key={c.slug} creator={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BusinessRow({ business }: { business: BusinessResult }) {
  const [from, to] = business.coverGradient
  return (
    <Link
      href={`/${business.slug}`}
      className="flex items-center gap-3 p-3 bg-bridge-card rounded-2xl border border-bridge-border/60 hover:border-bridge-accent-light shadow-sm transition-colors"
    >
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden"
        style={{
          background: business.coverPhotoUrl
            ? `url(${business.coverPhotoUrl}) center/cover`
            : `linear-gradient(135deg, ${from}, ${to})`,
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-bridge-heading text-sm truncate">{business.name}</p>
        <p className="text-bridge-muted text-xs mt-0.5">{business.category}</p>
        {business.location && (
          <p className="text-bridge-muted text-xs mt-0.5 flex items-center gap-1 truncate">
            <MapPin size={10} className="flex-shrink-0" />
            {business.location.split(',')[0]}
          </p>
        )}
      </div>
    </Link>
  )
}

function CreatorRow({ creator }: { creator: CreatorResult }) {
  return (
    <Link
      href={`/${creator.slug}`}
      className="flex items-center gap-3 p-3 bg-bridge-card rounded-2xl border border-bridge-border/60 hover:border-bridge-accent-light shadow-sm transition-colors"
    >
      {creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creator.avatarUrl}
          alt=""
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ backgroundColor: creator.avatarColor }}
        >
          {creator.avatarInitials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-bridge-heading text-sm truncate">{creator.displayName}</p>
        <p className="text-bridge-accent text-xs font-semibold mt-0.5">{creator.handle}</p>
        {creator.bio && (
          <p className="text-bridge-muted text-xs mt-0.5 line-clamp-1">{creator.bio}</p>
        )}
      </div>
    </Link>
  )
}
