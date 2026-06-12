'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Plus, Trash2, ChevronRight, Check, ArrowLeft, Clock,
  Phone, MessageCircle, Copy, Upload, Loader2, Star,
} from 'lucide-react'
import type { DayKey } from '@/lib/types'
import { signUpWithPassword } from '@/lib/auth-client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceDraft {
  id: string
  name: string
  description: string
  duration: number
  price: string
}

type Step = 'info' | 'services' | 'details' | 'done'

/** Structured primary-location fields. Composed into a single address string on submit. */
interface Address {
  street: string
  city: string
  state: string
  postal: string
  country: string
}

const EMPTY_ADDRESS: Address = { street: '', city: '', state: '', postal: '', country: '' }

/** Join the filled address parts into one display string for storage. */
function composeAddress(a: Address): string {
  return [a.street, a.city, a.state, a.postal, a.country]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ')
}

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

const STEP_ORDER: Step[] = ['info', 'services', 'details']

function StepBar({
  step,
  reachedIdx,
  onStepClick,
}: {
  step: Step
  /** Furthest step reached — only steps at/before this are navigable. */
  reachedIdx: number
  onStepClick: (s: Step) => void
}) {
  const idx = STEP_ORDER.indexOf(step)
  const labels = ['About', 'Services', 'Details']

  return (
    <div className="flex items-center gap-2 mb-8">
      {[0, 1, 2].map((i) => {
        const clickable = i <= reachedIdx && i !== idx
        const circle = (
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i <= idx ? 'bg-bridge-accent text-white' : 'bg-bridge-border text-bridge-muted'
            } ${clickable ? 'group-hover:ring-2 group-hover:ring-bridge-accent/30' : ''}`}
          >
            {i < idx ? <Check size={13} strokeWidth={3} /> : i + 1}
          </div>
        )
        return (
          <div key={i} className="flex items-center gap-2">
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick(STEP_ORDER[i])}
                aria-label={`Go to ${labels[i]}`}
                className="group relative rounded-full cursor-pointer"
              >
                {circle}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 -top-8 -translate-x-1/2 whitespace-nowrap rounded-md bg-bridge-ink px-2 py-1 text-[11px] font-semibold text-bridge-ink-foreground opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100"
                >
                  {labels[i]}
                </span>
              </button>
            ) : (
              circle
            )}
            {i < 2 && <div className={`h-0.5 w-6 rounded-full ${i < idx ? 'bg-bridge-accent' : 'bg-bridge-border'}`} />}
          </div>
        )
      })}
      <span className="ml-2 text-sm text-bridge-muted">{labels[idx] ?? ''}</span>
    </div>
  )
}

// ── Step 1: Info ─────────────────────────────────────────────────────────────

function InfoStep({
  name, setName, category, setCategory, address, setAddress,
  additionalLocations, setAdditionalLocations,
  description, setDescription, email, setEmail, password, setPassword, onNext,
}: {
  name: string; setName: (v: string) => void
  category: string; setCategory: (v: string) => void
  address: Address; setAddress: (v: Address) => void
  additionalLocations: string[]; setAdditionalLocations: (v: string[]) => void
  description: string; setDescription: (v: string) => void
  email: string; setEmail: (v: string) => void
  password: string; setPassword: (v: string) => void
  onNext: () => void
}) {
  const canContinue =
    name.trim() && category && address.street.trim() && address.city.trim() &&
    email.trim() && password.length >= 8

  const setField = (k: keyof Address, v: string) => setAddress({ ...address, [k]: v })
  const inputCls =
    'w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base'

  const addLocation = () => setAdditionalLocations([...additionalLocations, ''])
  const updateLocation = (i: number, v: string) =>
    setAdditionalLocations(additionalLocations.map((l, idx) => (idx === i ? v : l)))
  const removeLocation = (i: number) =>
    setAdditionalLocations(additionalLocations.filter((_, idx) => idx !== i))

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

        <div className="space-y-2">
          <input
            type="text" value={address.street} onChange={(e) => setField('street', e.target.value)}
            placeholder="Street address (e.g. 24 Sukhumvit Soi 24)"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text" value={address.city} onChange={(e) => setField('city', e.target.value)}
              placeholder="City *"
              className={inputCls}
            />
            <input
              type="text" value={address.state} onChange={(e) => setField('state', e.target.value)}
              placeholder="State / Province"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text" value={address.postal} onChange={(e) => setField('postal', e.target.value)}
              placeholder="Postal code"
              className={inputCls}
            />
            <input
              type="text" value={address.country} onChange={(e) => setField('country', e.target.value)}
              placeholder="Country"
              className={inputCls}
            />
          </div>
        </div>

        {additionalLocations.map((loc, i) => (
          <div key={i} className="flex gap-2 mt-2">
            <input
              type="text" value={loc} onChange={(e) => updateLocation(i, e.target.value)}
              placeholder={`Another location (branch ${i + 2})`}
              className="flex-1 border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
            />
            <button
              type="button" onClick={() => removeLocation(i)} aria-label="Remove location"
              className="flex-shrink-0 px-3 rounded-xl border border-bridge-border text-bridge-border-strong hover:text-bridge-accent hover:border-bridge-accent-light transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          type="button" onClick={addLocation}
          className="flex items-center gap-1.5 mt-2 text-sm font-semibold text-bridge-accent hover:text-bridge-accent-dark transition-colors"
        >
          <Plus size={14} /> Add another location
        </button>
        <p className="text-xs text-bridge-muted mt-1.5">
          Have more than one branch? Add them here — you can fine-tune each from the dashboard later.
        </p>
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
        <label className="block text-sm font-semibold text-bridge-text mb-1.5">
          Password <span className="text-bridge-accent">*</span>
        </label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoCapitalize="none" autoCorrect="off"
          className="w-full border border-bridge-border rounded-xl px-4 py-3 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-base"
        />
        <p className="text-xs text-bridge-muted mt-1.5">You can also sign in with a magic link or Google later.</p>
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

/** Max gallery photos collected during onboarding (matches the Settings limit). */
const MAX_PHOTOS = 5

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

  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  async function uploadPhotos(files: File[]) {
    if (uploading) return
    const remaining = MAX_PHOTOS - photos.length
    const batch = files.filter((f) => f.type.startsWith('image/')).slice(0, remaining)
    if (batch.length === 0) return
    setUploading(true)
    setPhotoError(null)
    const uploaded: string[] = []
    try {
      for (const file of batch) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/businesses/onboarding-photo', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Upload failed')
        uploaded.push(data.url)
        setPhotos([...photos, ...uploaded])
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  function makeCover(i: number) {
    if (i === 0) return
    setPhotos([photos[i], ...photos.filter((_, idx) => idx !== i)])
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
        <p className="text-xs text-bridge-muted mb-2">Up to {MAX_PHOTOS}. The first becomes your cover photo.</p>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {photos.map((p, i) => (
              <div key={`${p}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-bridge-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase bg-bridge-ink-static/80 text-white px-1.5 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
                <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                  {i !== 0 && (
                    <button
                      type="button" onClick={() => makeCover(i)} title="Make cover"
                      className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    type="button" onClick={() => removePhoto(i)} title="Remove"
                    className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_PHOTOS && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadPhotos(Array.from(e.target.files))
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files.length) uploadPhotos(Array.from(e.dataTransfer.files))
              }}
              className={`w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors ${
                dragOver
                  ? 'border-bridge-accent bg-bridge-accent-wash text-bridge-accent'
                  : 'border-bridge-border text-bridge-muted hover:border-bridge-accent-light hover:text-bridge-accent'
              }`}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : 'Upload or drag photos here'}
            </button>
          </>
        )}
        {photoError && <p className="text-xs text-red-600 mt-2">{photoError}</p>}
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

      <div className="w-full bg-bridge-bg rounded-2xl p-5 text-left mb-5">
        <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-2">Your page slug</p>
        <p className="font-mono text-bridge-accent font-semibold text-sm break-all">{slug}</p>
        <p className="text-bridge-muted text-xs mt-3">A creator can link to you at: <span className="text-bridge-secondary">{url}</span></p>
      </div>

      {/* Next steps — set up the rest from the dashboard */}
      <div className="w-full bg-bridge-bg rounded-2xl p-5 text-left mb-8">
        <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-3">Next, from your dashboard</p>
        <div className="space-y-2.5">
          <div className="flex gap-2.5 items-start">
            <span className="font-mono text-xs text-bridge-accent mt-0.5">1</span>
            <p className="text-sm text-bridge-secondary">
              <span className="font-semibold text-bridge-heading">Connect payments</span> — accept cards with Stripe so bookings can be paid online.
            </p>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="font-mono text-xs text-bridge-accent mt-0.5">2</span>
            <p className="text-sm text-bridge-secondary">
              <span className="font-semibold text-bridge-heading">Add your staff</span> — set who does what and when, so customers book the right person.
            </p>
          </div>
        </div>
      </div>

      <Link
        href={`/dashboard/business/${slug}`}
        className="w-full py-4 rounded-2xl bg-bridge-ink text-bridge-ink-foreground font-semibold text-base hover:bg-bridge-ink-hover transition-all flex items-center justify-center gap-2"
      >
        Open my dashboard →
      </Link>

      <Link
        href={`/${slug}`}
        className="w-full mt-3 py-3.5 rounded-2xl border border-bridge-border text-bridge-secondary font-semibold text-sm hover:border-bridge-border-strong hover:text-bridge-heading transition-all flex items-center justify-center"
      >
        Preview my booking page
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
  // Furthest step the user has advanced to — gates the clickable breadcrumb so
  // they can revisit completed steps but not skip ahead past validation.
  const [reachedIdx, setReachedIdx] = useState(0)
  function go(s: Step) {
    setStep(s)
    setReachedIdx((r) => Math.max(r, STEP_ORDER.indexOf(s)))
  }

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  const [additionalLocations, setAdditionalLocations] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [services, setServices] = useState<ServiceDraft[]>([
    { id: uid(), name: '', description: '', duration: 60, price: '' },
  ])

  const [hours, setHours] = useState<Record<DayKey, HoursDraft>>(DEFAULT_HOURS)
  const [contactPhone, setContactPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [contactLine, setContactLine] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

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
      // Create the auth account first so the new business record links to it
      // immediately (no "confirm by email before you can manage anything" gap).
      const { hasSession, alreadyRegistered } = await signUpWithPassword(email, password)
      if (alreadyRegistered) {
        throw new Error('That email already has an account. Please log in instead.')
      }

      const cleanPhotos = photos.map((p) => p.trim()).filter((p) => p.length > 0)
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, category, location: composeAddress(address), description, email,
          additionalLocations: additionalLocations.map((l) => l.trim()).filter((l) => l.length > 0),
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

      // Logged in already (email confirmation off) → drop them straight into the dashboard.
      if (hasSession) {
        window.location.href = `/dashboard/business/${data.slug}`
        return
      }

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
          <Link href="/" className="text-xs font-display font-bold text-bridge-accent tracking-tight">PLOI</Link>
          <h1 className="text-2xl font-display font-bold text-bridge-heading mt-4 leading-tight">
            {step === 'done' ? 'Page created' : 'List your business'}
          </h1>
          {step !== 'done' && (
            <p className="text-bridge-muted text-sm mt-1">Set up your PLOI booking page in under 10 minutes.</p>
          )}
        </div>

        {step !== 'done' && <StepBar step={step} reachedIdx={reachedIdx} onStepClick={go} />}

        {step === 'info' && (
          <InfoStep
            name={name} setName={setName}
            category={category} setCategory={setCategory}
            address={address} setAddress={setAddress}
            additionalLocations={additionalLocations} setAdditionalLocations={setAdditionalLocations}
            description={description} setDescription={setDescription}
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            onNext={() => go('services')}
          />
        )}

        {step === 'services' && (
          <ServicesStep
            services={services} setServices={setServices}
            onBack={() => setStep('info')}
            onNext={() => go('details')}
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
