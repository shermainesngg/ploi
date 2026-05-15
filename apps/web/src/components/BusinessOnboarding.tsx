'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus, Trash2, ChevronRight, Check, ArrowLeft, Clock,
  Phone, MessageCircle, Image as ImageIcon, Copy,
} from 'lucide-react'
import type { DayKey } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceDraft {
  id: string
  name: string
  description: string
  duration: number
  price: string
}

type Step = 'info' | 'services' | 'details' | 'done'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Beauty & Wellness', 'Hair & Barber', 'Nail & Spa', 'Fitness & Yoga',
  'Massage & Therapy', 'Tattoo & Piercing', 'Makeup & Styling', 'Other',
]

const DURATIONS = [20, 30, 45, 60, 75, 90, 120]

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}
const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function durationLabel(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Step bar ──────────────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: Step[] = ['info', 'services', 'details']
  const idx = steps.indexOf(step)
  const labels = ['About', 'Services', 'Details']

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
          {i < 2 && <div className={`h-0.5 w-6 rounded-full ${i < idx ? 'bg-bridge-accent' : 'bg-bridge-border'}`} />}
        </div>
      ))}
      <span className="ml-2 text-sm text-bridge-muted">{labels[idx] ?? ''}</span>
    </div>
  )
}

// ── Step 1: Info ─────────────────────────────────────────────────────────────

function InfoStep({
  name, setName, category, setCategory, location, setLocation,
  description, setDescription, email, setEmail, onNext,
}: {
  name: string; setName: (v: string) => void
  category: string; setCategory: (v: string) => void
  location: string; setLocation: (v: string) => void
  description: string; setDescription: (v: string) => void
  email: string; setEmail: (v: string) => void
  onNext: () => void
}) {
  const canContinue = name.trim() && category && location.trim() && email.trim()

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Business name <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Glow Studio Bangkok"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Category <span className="text-bridge-accent">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                category === c ? 'border-bridge-accent bg-bridge-accent text-white' : 'border-bridge-border text-bridge-secondary bg-bridge-card hover:border-bridge-accent-light'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Location <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="text" value={location} onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Sukhumvit Soi 24, Bangkok"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Owner email <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          autoCapitalize="none" autoCorrect="off"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
        />
        <p className="text-xs text-bridge-muted mt-1.5">For login and Stripe payouts.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">Short description</label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes your business special? (optional)"
          rows={3}
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base resize-none"
        />
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

// ── Step 2: Services ──────────────────────────────────────────────────────────

function ServicesStep({
  services, setServices, onBack, onNext,
}: {
  services: ServiceDraft[]
  setServices: (s: ServiceDraft[]) => void
  onBack: () => void
  onNext: () => void
}) {
  const canSubmit = services.length > 0 && services.every((s) => s.name.trim() && s.price)

  function addService() {
    setServices([...services, { id: uid(), name: '', description: '', duration: 60, price: '' }])
  }
  function updateService(id: string, key: keyof ServiceDraft, value: string | number) {
    setServices(services.map((s) => (s.id === id ? { ...s, [key]: value } : s)))
  }
  function removeService(id: string) {
    setServices(services.filter((s) => s.id !== id))
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-bridge-muted text-sm mb-6 hover:text-bridge-secondary">
        <ArrowLeft size={14} /> Back
      </button>

      <p className="text-bridge-muted text-sm mb-5">
        Add at least one service. Your booking page won&apos;t go live until you&apos;ve added one.
      </p>

      <div className="space-y-4 mb-4">
        {services.map((svc, idx) => (
          <div key={svc.id} className="bg-bridge-bg rounded-2xl p-4 border border-bridge-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-bridge-muted uppercase tracking-widest">Service {idx + 1}</span>
              {services.length > 1 && (
                <button onClick={() => removeService(svc.id)} className="text-bridge-border-strong hover:text-bridge-accent transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="text" value={svc.name} onChange={(e) => updateService(svc.id, 'name', e.target.value)}
                placeholder="Service name *"
                className="w-full border border-bridge-border rounded-xl px-3 py-2.5 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm bg-bridge-card"
              />
              <input
                type="text" value={svc.description} onChange={(e) => updateService(svc.id, 'description', e.target.value)}
                placeholder="Short description (optional)"
                className="w-full border border-bridge-border rounded-xl px-3 py-2.5 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm bg-bridge-card"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-bridge-muted mb-1.5 flex items-center gap-1">
                    <Clock size={11} /> Duration
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DURATIONS.map((d) => (
                      <button
                        key={d} onClick={() => updateService(svc.id, 'duration', d)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          svc.duration === d ? 'border-bridge-accent bg-bridge-accent text-white' : 'border-bridge-border text-bridge-secondary bg-bridge-card'
                        }`}
                      >
                        {durationLabel(d)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="w-28">
                  <label className="block text-xs text-bridge-muted mb-1.5">Price (THB)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bridge-muted text-sm">฿</span>
                    <input
                      type="number" value={svc.price} onChange={(e) => updateService(svc.id, 'price', e.target.value)}
                      placeholder="0"
                      className="w-full border border-bridge-border rounded-xl pl-7 pr-3 py-2.5 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm bg-bridge-card"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addService}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-bridge-border text-bridge-muted text-sm font-medium hover:border-bridge-accent-light hover:text-bridge-accent transition-colors flex items-center justify-center gap-2 mb-6"
      >
        <Plus size={16} /> Add another service
      </button>

      <button
        disabled={!canSubmit}
        onClick={onNext}
        className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        Continue <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ── Step 3: Details ───────────────────────────────────────────────────────────

interface HoursDraft {
  open: boolean
  start: string
  end: string
}

const DEFAULT_HOURS: Record<DayKey, HoursDraft> = {
  mon: { open: true, start: '10:00', end: '20:00' },
  tue: { open: true, start: '10:00', end: '20:00' },
  wed: { open: true, start: '10:00', end: '20:00' },
  thu: { open: true, start: '10:00', end: '20:00' },
  fri: { open: true, start: '10:00', end: '20:00' },
  sat: { open: true, start: '10:00', end: '20:00' },
  sun: { open: false, start: '10:00', end: '20:00' },
}

function DetailsStep({
  hours, setHours,
  contactPhone, setContactPhone,
  contactWhatsapp, setContactWhatsapp,
  contactLine, setContactLine,
  photos, setPhotos,
  onBack, onSubmit,
  loading, error,
}: {
  hours: Record<DayKey, HoursDraft>
  setHours: (h: Record<DayKey, HoursDraft>) => void
  contactPhone: string; setContactPhone: (v: string) => void
  contactWhatsapp: string; setContactWhatsapp: (v: string) => void
  contactLine: string; setContactLine: (v: string) => void
  photos: string[]; setPhotos: (p: string[]) => void
  onBack: () => void
  onSubmit: () => void
  loading: boolean; error: string | null
}) {
  const hasContact = (contactPhone + contactWhatsapp + contactLine).trim().length > 0
  const canSubmit = hasContact

  function setAllSame() {
    // Use Monday's settings for all days
    const m = hours.mon
    const next = { ...hours }
    for (const d of DAY_ORDER) {
      next[d] = { ...m }
    }
    setHours(next)
  }

  function updateDay(d: DayKey, change: Partial<HoursDraft>) {
    setHours({ ...hours, [d]: { ...hours[d], ...change } })
  }

  function updatePhoto(i: number, url: string) {
    const next = [...photos]
    next[i] = url
    setPhotos(next)
  }
  function addPhoto() {
    if (photos.length >= 5) return
    setPhotos([...photos, ''])
  }
  function removePhoto(i: number) {
    setPhotos(photos.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-bridge-muted text-sm mb-6 hover:text-bridge-secondary">
        <ArrowLeft size={14} /> Back
      </button>

      <p className="text-bridge-muted text-sm mb-5">
        These show on your public booking page. Customers expect contact info and hours.
      </p>

      {/* Hours */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-bridge-text">Opening hours</label>
          <button
            onClick={setAllSame}
            className="flex items-center gap-1 text-xs font-semibold text-bridge-accent hover:bg-bridge-accent-wash px-2 py-1 rounded-md"
          >
            <Copy size={11} /> Same every day
          </button>
        </div>
        <div className="bg-bridge-bg rounded-2xl border border-bridge-border divide-y divide-bridge-border">
          {DAY_ORDER.map((d) => (
            <div key={d} className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-sm font-semibold text-bridge-text w-10">{DAY_LABELS[d]}</span>
              <button
                onClick={() => updateDay(d, { open: !hours[d].open })}
                className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                  hours[d].open ? 'bg-green-100 text-green-700' : 'bg-bridge-border text-bridge-muted'
                }`}
              >
                {hours[d].open ? 'Open' : 'Closed'}
              </button>
              {hours[d].open && (
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="time" value={hours[d].start}
                    onChange={(e) => updateDay(d, { start: e.target.value })}
                    className="border border-bridge-border rounded-md px-1.5 py-1 text-xs bg-bridge-card"
                  />
                  <span className="text-bridge-muted text-xs">–</span>
                  <input
                    type="time" value={hours[d].end}
                    onChange={(e) => updateDay(d, { end: e.target.value })}
                    className="border border-bridge-border rounded-md px-1.5 py-1 text-xs bg-bridge-card"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-bridge-text mb-2">
          Contact <span className="text-bridge-accent">*</span>{' '}
          <span className="text-bridge-muted font-normal text-xs">(at least one)</span>
        </label>
        <div className="space-y-2">
          <div className="relative">
            <Phone size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-bridge-muted" />
            <input
              type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full border border-bridge-border rounded-xl pl-10 pr-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm"
            />
          </div>
          <div className="relative">
            <MessageCircle size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600" />
            <input
              type="tel" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="WhatsApp number"
              className="w-full border border-bridge-border rounded-xl pl-10 pr-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm"
            />
          </div>
          <div className="relative">
            <MessageCircle size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-bridge-muted" />
            <input
              type="text" value={contactLine} onChange={(e) => setContactLine(e.target.value)}
              placeholder="LINE ID (e.g. @yourshop)"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full border border-bridge-border rounded-xl pl-10 pr-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-bridge-text mb-1">Photos</label>
        <p className="text-xs text-bridge-muted mb-2">Up to 5 URLs. The first becomes your cover photo.</p>
        <div className="space-y-2">
          {photos.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <ImageIcon size={13} className="text-bridge-muted flex-shrink-0" />
              <input
                type="url" value={p} onChange={(e) => updatePhoto(i, e.target.value)}
                placeholder="https://..."
                autoCapitalize="none" autoCorrect="off"
                className="flex-1 min-w-0 border border-bridge-border rounded-lg px-3 py-2 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-xs font-mono"
              />
              <button onClick={() => removePhoto(i)} className="text-bridge-border-strong hover:text-bridge-accent flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        {photos.length < 5 && (
          <button
            onClick={addPhoto}
            className="w-full mt-2 py-2 rounded-xl border-2 border-dashed border-bridge-border text-bridge-muted text-xs font-medium hover:border-bridge-accent-light hover:text-bridge-accent flex items-center justify-center gap-1"
          >
            <Plus size={13} /> Add a photo
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      <button
        disabled={!canSubmit || loading}
        onClick={onSubmit}
        className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bridge-accent-dark active:scale-[0.98] transition-all"
      >
        {loading ? 'Creating your page…' : 'Create my booking page'}
      </button>
    </div>
  )
}

// ── Done ──────────────────────────────────────────────────────────────────────

function DoneScreen({ slug }: { slug: string }) {
  const url = `bridge.to/[creator]/${slug}`
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="w-20 h-20 rounded-full bg-bridge-accent-wash flex items-center justify-center mb-6">
        <Check size={36} className="text-bridge-accent" strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-display font-bold text-bridge-heading mb-2">You&apos;re live!</h2>
      <p className="text-bridge-muted text-sm mb-8 max-w-xs">
        Your booking page is ready. Share it with a creator to start getting attributed bookings.
      </p>

      <div className="w-full bg-bridge-bg rounded-2xl p-5 text-left mb-8">
        <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-2">Your page slug</p>
        <p className="font-mono text-bridge-accent font-semibold text-sm break-all">{slug}</p>
        <p className="text-bridge-muted text-xs mt-3">A creator can link to you at: <span className="text-bridge-secondary">{url}</span></p>
      </div>

      <Link
        href={`/${slug}`}
        className="w-full py-4 rounded-2xl bg-bridge-heading text-white font-semibold text-base hover:bg-bridge-text transition-all flex items-center justify-center gap-2"
      >
        Preview my booking page →
      </Link>

      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/onboard/creator" className="text-bridge-accent font-medium hover:underline">Invite a creator</Link>
        <span className="text-bridge-border-strong">·</span>
        <Link href="/" className="text-bridge-muted hover:text-bridge-secondary">Go home</Link>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BusinessOnboarding() {
  const [step, setStep] = useState<Step>('info')

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')

  const [services, setServices] = useState<ServiceDraft[]>([
    { id: uid(), name: '', description: '', duration: 60, price: '' },
  ])

  const [hours, setHours] = useState<Record<DayKey, HoursDraft>>(DEFAULT_HOURS)
  const [contactPhone, setContactPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [contactLine, setContactLine] = useState('')
  const [photos, setPhotos] = useState<string[]>([''])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  function buildOpeningHours() {
    const out: Record<string, string> = {}
    for (const d of DAY_ORDER) {
      out[d] = hours[d].open ? `${hours[d].start}-${hours[d].end}` : 'closed'
    }
    return out
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const cleanPhotos = photos.map((p) => p.trim()).filter((p) => p.length > 0)
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, category, location, description, email,
          openingHours: buildOpeningHours(),
          contactPhone: contactPhone.trim() || undefined,
          contactWhatsapp: contactWhatsapp.trim() || undefined,
          contactLine: contactLine.trim() || undefined,
          photos: cleanPhotos,
          services: services.map((s) => ({
            name: s.name, description: s.description,
            duration: s.duration, price: Number(s.price),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setCreatedSlug(data.slug)
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
            {step === 'done' ? 'Page created' : 'List your business'}
          </h1>
          {step !== 'done' && (
            <p className="text-bridge-muted text-sm mt-1">Set up your BRIDGE booking page in under 10 minutes.</p>
          )}
        </div>

        {step !== 'done' && <StepBar step={step} />}

        {step === 'info' && (
          <InfoStep
            name={name} setName={setName}
            category={category} setCategory={setCategory}
            location={location} setLocation={setLocation}
            description={description} setDescription={setDescription}
            email={email} setEmail={setEmail}
            onNext={() => setStep('services')}
          />
        )}

        {step === 'services' && (
          <ServicesStep
            services={services} setServices={setServices}
            onBack={() => setStep('info')}
            onNext={() => setStep('details')}
          />
        )}

        {step === 'details' && (
          <DetailsStep
            hours={hours} setHours={setHours}
            contactPhone={contactPhone} setContactPhone={setContactPhone}
            contactWhatsapp={contactWhatsapp} setContactWhatsapp={setContactWhatsapp}
            contactLine={contactLine} setContactLine={setContactLine}
            photos={photos} setPhotos={setPhotos}
            onBack={() => setStep('services')}
            onSubmit={handleSubmit}
            loading={loading} error={error}
          />
        )}

        {step === 'done' && createdSlug && <DoneScreen slug={createdSlug} />}
      </div>
    </div>
  )
}
