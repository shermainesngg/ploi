'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Check,
  ArrowLeft,
  ExternalLink,
  Plus,
  Trash2,
  Music,
  Instagram,
  Youtube,
  Twitter,
  Globe,
} from 'lucide-react'
import type { Social, SocialPlatform } from '@/lib/types'

type Step = 'profile' | 'socials' | 'done'

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
  const steps: Step[] = ['profile', 'socials']
  const idx = steps.indexOf(step)
  const labels = ['Your profile', 'Your socials']

  return (
    <div className="flex items-center gap-2 mb-8">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < idx ? 'bg-bridge-accent text-white' : i === idx ? 'bg-bridge-accent text-white' : 'bg-bridge-border text-bridge-muted'
            }`}
          >
            {i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}
          </div>
          {i < 1 && (
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
          You earn <span className="font-semibold text-bridge-accent">10%</span> on every booking driven through your PLOI link. No minimums. Paid monthly.
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
  loading, error,
}: {
  socials: SocialDraft[]
  setSocials: (s: SocialDraft[]) => void
  onBack: () => void
  onNext: () => void
  loading?: boolean
  error?: string | null
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
              className="bg-bridge-card border border-bridge-border rounded-lg px-2 py-2 text-sm font-medium text-bridge-text focus:outline-none focus:ring-2 focus:ring-bridge-accent flex-shrink-0"
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
              className="flex-1 min-w-0 bg-bridge-card border border-bridge-border rounded-lg px-3 py-2 text-sm text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent"
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      <button
        onClick={onNext}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        {loading ? 'Creating profile…' : 'Create my profile'}
      </button>

      <button
        onClick={onNext}
        disabled={loading}
        className="w-full mt-2 text-bridge-muted text-xs hover:text-bridge-secondary py-2 disabled:opacity-30"
      >
        Skip socials for now
      </button>
    </div>
  )
}

// ── Done screen ───────────────────────────────────────────────────────────────

function DoneScreen({ slug }: { slug: string }) {
  const profileUrl = `bridge.to/${slug}`

  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="w-20 h-20 rounded-full bg-bridge-accent-wash flex items-center justify-center mb-6">
        <Check size={36} className="text-bridge-accent" strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-display font-bold text-bridge-heading mb-2">You&apos;re in!</h2>
      <p className="text-bridge-muted text-sm mb-8 max-w-xs">
        Your PLOI profile is live. Head to your dashboard to add places you love and start earning.
      </p>

      <div className="w-full space-y-3 mb-8">
        <div className="bg-bridge-bg rounded-2xl p-4 text-left">
          <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-1.5">Your profile</p>
          <Link href={`/${slug}`} className="flex items-center gap-2 text-bridge-accent font-semibold text-sm hover:underline">
            {profileUrl} <ExternalLink size={13} />
          </Link>
        </div>

        <div className="bg-bridge-accent-wash rounded-2xl p-4 text-left border border-bridge-accent-light">
          <p className="text-sm font-semibold text-bridge-heading mb-1">Next step: add your first place</p>
          <p className="text-xs text-bridge-muted leading-relaxed">
            Search for a business, link your content, and earn 10% on every booking through your link.
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/creator/${slug}`}
        className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base hover:bg-bridge-accent-dark transition-all flex items-center justify-center gap-2"
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
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
          <Link href="/" className="text-xs font-display font-bold text-bridge-accent tracking-tight">PLOI</Link>
          <h1 className="text-2xl font-display font-bold text-bridge-heading mt-4 leading-tight">
            {step === 'done' ? 'Welcome to PLOI' : 'Share spots you love. Earn when people book.'}
          </h1>
          {step !== 'done' && (
            <p className="text-bridge-muted text-sm mt-1">
              Set up your profile and you&apos;re live. Add places from your dashboard.
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
            onNext={handleSubmit}
            loading={loading}
            error={error}
          />
        )}

        {step === 'done' && createdSlug && (
          <DoneScreen slug={createdSlug} />
        )}
      </div>
    </div>
  )
}
