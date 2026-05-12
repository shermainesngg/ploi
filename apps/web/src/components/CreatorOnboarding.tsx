'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Check,
  ArrowLeft,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Music,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Search,
  Clock,
} from 'lucide-react'
import type { Social, SocialPlatform } from '@/lib/types'

type Step = 'profile' | 'socials' | 'pick-business' | 'done'

const PLATFORMS: { value: SocialPlatform; label: string; icon: React.ReactNode }[] = [
  { value: 'tiktok', label: 'TikTok', icon: <Music size={13} /> },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={13} /> },
  { value: 'youtube', label: 'YouTube', icon: <Youtube size={13} /> },
  { value: 'x', label: 'X', icon: <Twitter size={13} /> },
  { value: 'other', label: 'Other', icon: <Globe size={13} /> },
]

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Step bar ──────────────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: Step[] = ['profile', 'socials', 'pick-business']
  const idx = steps.indexOf(step)
  const labels = ['Your profile', 'Your socials', 'Pick a place']

  return (
    <div className="flex items-center gap-2 mb-8">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < idx ? 'bg-bridge-accent text-white' : i === idx ? 'bg-bridge-accent text-white' : 'bg-bridge-border text-bridge-muted'
            }`}
          >
            {i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}
          </div>
          {i < 2 && (
            <div className={`h-0.5 w-6 rounded-full ${i < idx ? 'bg-bridge-accent' : 'bg-bridge-border'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-bridge-muted">{labels[idx] ?? ''}</span>
    </div>
  )
}

// ── Step 1: Profile ───────────────────────────────────────────────────────────

function ProfileStep({
  handle, setHandle,
  displayName, setDisplayName,
  email, setEmail,
  bio, setBio,
  onNext,
}: {
  handle: string; setHandle: (v: string) => void
  displayName: string; setDisplayName: (v: string) => void
  email: string; setEmail: (v: string) => void
  bio: string; setBio: (v: string) => void
  onNext: () => void
}) {
  const canContinue = handle.trim() && displayName.trim() && email.trim()

  function handleHandleChange(v: string) {
    const clean = v.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '')
    setHandle(clean ? `@${clean}` : '')
  }

  const slug = handle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '')

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Creator handle <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => handleHandleChange(e.target.value)}
          placeholder="@yourhandle"
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base font-mono"
        />
        {slug && (
          <p className="text-xs text-bridge-muted mt-1.5">
            Profile: <span className="font-medium text-bridge-secondary">bridge.to/{slug}</span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Display name <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Sara Chen"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Email <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoCapitalize="none" autoCorrect="off"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
        />
        <p className="text-xs text-bridge-muted mt-1.5">For payouts and login.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What do you create content about? Where are you based?"
          rows={3}
          maxLength={200}
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base resize-none"
        />
        <p className="text-xs text-bridge-muted mt-1 text-right">{bio.length}/200</p>
      </div>

      {/* Earnings explainer */}
      <div className="bg-bridge-accent-wash rounded-2xl p-4 border border-bridge-accent-wash">
        <p className="text-sm font-semibold text-bridge-text mb-1">How earnings work</p>
        <p className="text-sm text-bridge-muted leading-relaxed">
          You earn <span className="font-semibold text-bridge-accent">10%</span> on every booking driven through your BRIDGE link. No minimums. Paid monthly.
        </p>
      </div>

      <button
        disabled={!canContinue}
        onClick={onNext}
        className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        Continue <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ── Step 2: Socials ───────────────────────────────────────────────────────────

interface SocialDraft {
  id: string
  platform: SocialPlatform
  url: string
}

function SocialsStep({
  socials, setSocials,
  onBack, onNext,
}: {
  socials: SocialDraft[]
  setSocials: (s: SocialDraft[]) => void
  onBack: () => void
  onNext: () => void
}) {
  function addSocial() {
    setSocials([...socials, { id: uid(), platform: 'tiktok', url: '' }])
  }
  function updateSocial(id: string, key: 'platform' | 'url', value: string) {
    setSocials(socials.map((s) => (s.id === id ? { ...s, [key]: value } : s)))
  }
  function removeSocial(id: string) {
    setSocials(socials.filter((s) => s.id !== id))
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-bridge-muted text-sm mb-6 hover:text-bridge-secondary"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <p className="text-bridge-muted text-sm mb-5">
        Add your social profiles so visitors can follow you. (Optional, but recommended.)
      </p>

      <div className="space-y-3 mb-3">
        {socials.map((s) => (
          <div key={s.id} className="bg-bridge-bg rounded-2xl p-3 border border-bridge-border flex items-center gap-2">
            <select
              value={s.platform}
              onChange={(e) => updateSocial(s.id, 'platform', e.target.value)}
              className="bg-white border border-bridge-border rounded-lg px-2 py-2 text-sm font-medium text-bridge-text focus:outline-none focus:ring-2 focus:ring-bridge-accent flex-shrink-0"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={s.url}
              onChange={(e) => updateSocial(s.id, 'url', e.target.value)}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect="off"
              className="flex-1 min-w-0 bg-white border border-bridge-border rounded-lg px-3 py-2 text-sm text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent"
            />
            {socials.length > 1 && (
              <button
                onClick={() => removeSocial(s.id)}
                className="text-bridge-border-strong hover:text-bridge-accent transition-colors flex-shrink-0 px-1"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addSocial}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-bridge-border text-bridge-muted text-sm font-medium hover:border-bridge-accent-light hover:text-bridge-accent transition-colors flex items-center justify-center gap-2 mb-6"
      >
        <Plus size={16} /> Add another platform
      </button>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        Continue <ChevronRight size={18} />
      </button>

      <button
        onClick={onNext}
        className="w-full mt-2 text-bridge-muted text-xs hover:text-bridge-secondary py-2"
      >
        Skip for now
      </button>
    </div>
  )
}

// ── Step 3: Pick a business + content URL ─────────────────────────────────────

interface BusinessSearchResult {
  slug: string
  name: string
  category: string
  location: string
  coverGradient: [string, string]
  coverPhotoUrl: string | null
}

function PickBusinessStep({
  selectedBusiness, setSelectedBusiness,
  contentUrl, setContentUrl,
  contentPlatform, setContentPlatform,
  thumbnailUrl, setThumbnailUrl,
  onBack, onSubmit,
  loading, error,
}: {
  selectedBusiness: BusinessSearchResult | null
  setSelectedBusiness: (b: BusinessSearchResult | null) => void
  contentUrl: string; setContentUrl: (v: string) => void
  contentPlatform: SocialPlatform; setContentPlatform: (v: SocialPlatform) => void
  thumbnailUrl: string; setThumbnailUrl: (v: string) => void
  onBack: () => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BusinessSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search
  useEffect(() => {
    if (selectedBusiness) return  // don't search if one is locked in
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
  }, [query, selectedBusiness])

  const canSubmit = !!selectedBusiness && contentUrl.trim().length > 0

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-bridge-muted text-sm mb-6 hover:text-bridge-secondary"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <p className="text-bridge-muted text-sm mb-5">
        Pick a place you&apos;ve made content about. Your link goes live as soon as the business accepts.
      </p>

      {/* Business search / picker */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Business <span className="text-bridge-accent">*</span>
        </label>

        {selectedBusiness ? (
          <div className="bg-white rounded-2xl border border-bridge-border p-3 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex-shrink-0"
              style={{
                background: selectedBusiness.coverPhotoUrl
                  ? `url(${selectedBusiness.coverPhotoUrl}) center/cover`
                  : `linear-gradient(135deg, ${selectedBusiness.coverGradient[0]}, ${selectedBusiness.coverGradient[1]})`,
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-bridge-heading text-sm truncate">{selectedBusiness.name}</p>
              <p className="text-bridge-muted text-xs truncate">{selectedBusiness.category} · {selectedBusiness.location}</p>
            </div>
            <button
              onClick={() => {
                setSelectedBusiness(null)
                setQuery('')
              }}
              className="text-bridge-muted hover:text-bridge-accent text-xs font-semibold"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-bridge-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a business…"
                className="w-full border border-bridge-border rounded-xl pl-10 pr-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
              />
            </div>

            {query.length > 0 && (
              <div className="mt-2 bg-white border border-bridge-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {searching ? (
                  <p className="text-bridge-muted text-sm p-4 flex items-center gap-2">
                    <Clock size={13} /> Searching…
                  </p>
                ) : results.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-bridge-muted text-sm">No matches.</p>
                    <Link href="/onboard/business" className="text-bridge-accent text-xs font-semibold hover:underline mt-1 inline-block">
                      List a new business →
                    </Link>
                  </div>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.slug}
                      onClick={() => setSelectedBusiness(r)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-bridge-bg transition-colors border-b border-bridge-border/60 last:border-b-0"
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
                        <p className="text-sm font-semibold text-bridge-heading truncate">{r.name}</p>
                        <p className="text-xs text-bridge-muted truncate">{r.category} · {r.location}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Content URL */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Your content URL <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="url"
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@you/video/..."
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base font-mono text-sm"
        />
        <p className="text-bridge-muted text-xs mt-1">The TikTok / Reel / post that recommends this place.</p>
      </div>

      {/* Platform */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">Platform</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => setContentPlatform(p.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                contentPlatform === p.value
                  ? 'border-bridge-accent bg-bridge-accent text-white'
                  : 'border-bridge-border text-bridge-secondary bg-white hover:border-bridge-accent-light'
              }`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thumbnail URL (optional) */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Thumbnail URL <span className="text-bridge-muted font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://..."
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base font-mono text-sm"
        />
        <p className="text-bridge-muted text-xs mt-1">Image to show on your profile grid. Falls back to the business cover.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bridge-accent-dark active:scale-[0.98] transition-all"
      >
        {loading ? 'Creating profile & link…' : 'Create profile & generate link'}
      </button>
    </div>
  )
}

// ── Done screen ───────────────────────────────────────────────────────────────

function DoneScreen({
  slug,
  businessSlug,
  linkStatus,
}: {
  slug: string
  businessSlug: string | null
  linkStatus: 'pending' | 'active' | null
}) {
  const profileUrl = `bridge.to/${slug}`
  const linkUrl = businessSlug ? `bridge.to/${slug}/${businessSlug}` : null
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (!linkUrl) return
    navigator.clipboard.writeText(linkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="w-20 h-20 rounded-full bg-bridge-accent-wash flex items-center justify-center mb-6">
        <Check size={36} className="text-bridge-accent" strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-display font-bold text-bridge-heading mb-2">You&apos;re in!</h2>
      <p className="text-bridge-muted text-sm mb-8 max-w-xs">
        Your BRIDGE profile is live. {linkStatus === 'pending' ? 'Your first link is pending business approval.' : 'Share your link to start earning.'}
      </p>

      <div className="w-full space-y-3 mb-8">
        <div className="bg-bridge-bg rounded-2xl p-4 text-left">
          <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-1.5">Your profile</p>
          <Link href={`/${slug}`} className="flex items-center gap-2 text-bridge-accent font-semibold text-sm hover:underline">
            {profileUrl} <ExternalLink size={13} />
          </Link>
        </div>

        {linkUrl && (
          <div className="bg-bridge-bg rounded-2xl p-4 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest">Your booking link</p>
              {linkStatus === 'pending' && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                  Pending
                </span>
              )}
              {linkStatus === 'active' && (
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full uppercase">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-bridge-text font-mono text-sm truncate">{linkUrl}</span>
              <button
                onClick={copyLink}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-bridge-accent bg-bridge-accent-wash px-3 py-1.5 rounded-lg hover:bg-bridge-accent-wash transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-bridge-muted mt-2">
              {linkStatus === 'pending'
                ? "We'll notify you when the business accepts. Tracking starts then."
                : 'Drop this in your bio, stories, or captions.'}
            </p>
          </div>
        )}
      </div>

      <Link
        href={`/dashboard/creator/${slug}`}
        className="w-full py-4 rounded-2xl bg-bridge-heading text-white font-semibold text-base hover:bg-bridge-heading/90 transition-all flex items-center justify-center gap-2"
      >
        Go to my dashboard →
      </Link>

      <Link href={`/${slug}`} className="mt-4 text-sm text-bridge-muted hover:text-bridge-secondary">
        View my profile
      </Link>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CreatorOnboarding() {
  const [step, setStep] = useState<Step>('profile')

  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [socials, setSocials] = useState<SocialDraft[]>([
    { id: uid(), platform: 'tiktok', url: '' },
  ])

  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSearchResult | null>(null)
  const [contentUrl, setContentUrl] = useState('')
  const [contentPlatform, setContentPlatform] = useState<SocialPlatform>('tiktok')
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [createdLinkStatus, setCreatedLinkStatus] = useState<'pending' | 'active' | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      // 1. Create the creator
      const cleanSocials: Social[] = socials
        .filter((s) => s.url.trim().length > 0)
        .map((s) => ({ platform: s.platform, url: s.url.trim() }))

      const creatorRes = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, displayName, email, bio, socials: cleanSocials }),
      })
      const creatorData = await creatorRes.json()
      if (!creatorRes.ok) throw new Error(creatorData.error ?? 'Could not create creator')

      // 2. Create the link to the selected business
      if (selectedBusiness) {
        const linkRes = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorSlug: creatorData.slug,
            businessSlug: selectedBusiness.slug,
            contentUrl: contentUrl.trim(),
            platform: contentPlatform,
            contentThumbnailUrl: thumbnailUrl.trim() || undefined,
          }),
        })
        const linkData = await linkRes.json()
        if (!linkRes.ok) throw new Error(linkData.error ?? 'Could not generate link')
        setCreatedLinkStatus(linkData.status === 'active' ? 'active' : 'pending')
      }

      setCreatedSlug(creatorData.slug)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-8">
          <Link href="/" className="text-xs font-display font-bold text-bridge-accent tracking-tight">BRIDGE</Link>
          <h1 className="text-2xl font-display font-bold text-bridge-heading mt-4 leading-tight">
            {step === 'done' ? 'Welcome to BRIDGE' : 'Share spots you love. Earn when people book.'}
          </h1>
          {step !== 'done' && (
            <p className="text-bridge-muted text-sm mt-1">
              Set up your profile, link your first place, and you&apos;re live.
            </p>
          )}
        </div>

        {step !== 'done' && <StepBar step={step} />}

        {step === 'profile' && (
          <ProfileStep
            handle={handle} setHandle={setHandle}
            displayName={displayName} setDisplayName={setDisplayName}
            email={email} setEmail={setEmail}
            bio={bio} setBio={setBio}
            onNext={() => setStep('socials')}
          />
        )}

        {step === 'socials' && (
          <SocialsStep
            socials={socials}
            setSocials={setSocials}
            onBack={() => setStep('profile')}
            onNext={() => setStep('pick-business')}
          />
        )}

        {step === 'pick-business' && (
          <PickBusinessStep
            selectedBusiness={selectedBusiness}
            setSelectedBusiness={setSelectedBusiness}
            contentUrl={contentUrl}
            setContentUrl={setContentUrl}
            contentPlatform={contentPlatform}
            setContentPlatform={setContentPlatform}
            thumbnailUrl={thumbnailUrl}
            setThumbnailUrl={setThumbnailUrl}
            onBack={() => setStep('socials')}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        )}

        {step === 'done' && createdSlug && (
          <DoneScreen
            slug={createdSlug}
            businessSlug={selectedBusiness?.slug ?? null}
            linkStatus={createdLinkStatus}
          />
        )}
      </div>
    </div>
  )
}
