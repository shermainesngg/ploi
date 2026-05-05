'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  X, Search, Music, Instagram, Youtube, Twitter, Globe, Clock, ArrowLeft, Check,
} from 'lucide-react'
import type { SocialPlatform } from '@/lib/types'

interface BusinessSearchResult {
  slug: string
  name: string
  category: string
  location: string
  coverGradient: [string, string]
  coverPhotoUrl: string | null
}

const PLATFORMS: { value: SocialPlatform; label: string; icon: React.ReactNode }[] = [
  { value: 'tiktok', label: 'TikTok', icon: <Music size={13} /> },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={13} /> },
  { value: 'youtube', label: 'YouTube', icon: <Youtube size={13} /> },
  { value: 'x', label: 'X', icon: <Twitter size={13} /> },
  { value: 'other', label: 'Other', icon: <Globe size={13} /> },
]

export default function AddPlaceModal({
  creatorSlug,
  onClose,
  onCreated,
}: {
  creatorSlug: string
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState<'pick' | 'details' | 'done'>('pick')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BusinessSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSearchResult | null>(null)
  const [contentUrl, setContentUrl] = useState('')
  const [platform, setPlatform] = useState<SocialPlatform>('tiktok')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [featuredServiceId, setFeaturedServiceId] = useState<string>('')
  const [businessServices, setBusinessServices] = useState<Array<{ id: string; name: string; price: number; duration: number }>>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When the user picks a business, fetch its services for the featured-service dropdown
  useEffect(() => {
    if (!selectedBusiness) { setBusinessServices([]); setFeaturedServiceId(''); return }
    fetch(`/api/businesses/${selectedBusiness.slug}/services`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setBusinessServices(data) })
      .catch(() => {})
  }, [selectedBusiness])

  // Debounced search
  useEffect(() => {
    if (step !== 'pick') return
    if (selectedBusiness) return
    if (query.trim().length < 1) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/businesses/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selectedBusiness, step])

  function pickBusiness(b: BusinessSearchResult) {
    setSelectedBusiness(b)
    setStep('details')
  }

  async function submit() {
    if (!selectedBusiness) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorSlug,
          businessSlug: selectedBusiness.slug,
          contentUrl: contentUrl.trim(),
          platform,
          contentThumbnailUrl: thumbnailUrl.trim() || undefined,
          featuredServiceId: featuredServiceId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not generate link')
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    onClose()
    if (step === 'done') onCreated()
  }

  const canSubmit = !!selectedBusiness && contentUrl.trim().length > 0

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={handleClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              {step === 'details' && (
                <button
                  onClick={() => setStep('pick')}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="font-bold text-stone-900 text-lg">
                {step === 'pick' ? 'Add a new place' : step === 'details' ? 'Your content' : 'Done'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              <X size={16} className="text-stone-600" />
            </button>
          </div>

          <div className="px-5 py-4 overflow-y-auto">
            {/* Step 1: Pick */}
            {step === 'pick' && (
              <div>
                <p className="text-stone-500 text-sm mb-4">
                  Search for a business you&apos;ve made content about.
                </p>

                <div className="relative">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                    placeholder="Business name…"
                    className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                  />
                </div>

                {query.length > 0 && (
                  <div className="mt-3 bg-white border border-stone-200 rounded-xl overflow-hidden">
                    {searching ? (
                      <p className="text-stone-400 text-sm p-4 flex items-center gap-2">
                        <Clock size={13} /> Searching…
                      </p>
                    ) : results.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-stone-400 text-sm">No matches.</p>
                        <Link
                          href="/onboard/business"
                          className="text-rose-600 text-xs font-semibold hover:underline mt-1 inline-block"
                        >
                          List a new business →
                        </Link>
                      </div>
                    ) : (
                      results.map((r) => (
                        <button
                          key={r.slug}
                          onClick={() => pickBusiness(r)}
                          className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 border-b border-stone-100 last:border-b-0"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex-shrink-0"
                            style={{
                              background: r.coverPhotoUrl
                                ? `url(${r.coverPhotoUrl}) center/cover`
                                : `linear-gradient(135deg, ${r.coverGradient[0]}, ${r.coverGradient[1]})`,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate">{r.name}</p>
                            <p className="text-xs text-stone-400 truncate">{r.category} · {r.location}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && selectedBusiness && (
              <div className="space-y-5 pb-4">
                {/* Business preview */}
                <div className="bg-stone-50 rounded-2xl p-3 flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex-shrink-0"
                    style={{
                      background: selectedBusiness.coverPhotoUrl
                        ? `url(${selectedBusiness.coverPhotoUrl}) center/cover`
                        : `linear-gradient(135deg, ${selectedBusiness.coverGradient[0]}, ${selectedBusiness.coverGradient[1]})`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 text-sm truncate">{selectedBusiness.name}</p>
                    <p className="text-stone-400 text-xs truncate">{selectedBusiness.location}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Content URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@you/video/..."
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPlatform(p.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                          platform === p.value
                            ? 'border-rose-600 bg-rose-600 text-white'
                            : 'border-stone-200 text-stone-600 bg-white hover:border-rose-300'
                        }`}
                      >
                        {p.icon}
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Featured service */}
                {businessServices.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Which service did you feature? <span className="text-stone-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={featuredServiceId}
                      onChange={(e) => setFeaturedServiceId(e.target.value)}
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '14px',
                        paddingRight: '2.25rem',
                      }}
                    >
                      <option value="">No specific service</option>
                      {businessServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · ฿{s.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-stone-400 mt-1.5">
                      Customers landing from your link will see this service front-and-centre.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Thumbnail URL <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://..."
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm font-mono"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
                )}

                <button
                  onClick={submit}
                  disabled={!canSubmit || loading}
                  className="w-full py-4 rounded-2xl bg-rose-600 text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-700 active:scale-[0.98] transition-all"
                >
                  {loading ? 'Generating link…' : 'Generate BRIDGE link'}
                </button>
              </div>
            )}

            {/* Step 3: Done */}
            {step === 'done' && (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                  <Check size={28} className="text-rose-600" strokeWidth={3} />
                </div>
                <h3 className="text-lg font-black text-stone-900 mb-1">Link sent</h3>
                <p className="text-stone-500 text-sm mb-6 max-w-xs">
                  Your link is pending. We&apos;ll notify you when {selectedBusiness?.name} accepts it.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full py-3.5 rounded-2xl bg-stone-900 text-white font-semibold text-base hover:bg-stone-800 transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
