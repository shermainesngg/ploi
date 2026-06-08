'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone, MessageCircle, Copy, Trash2, Upload,
  Check, Star, Loader2,
} from 'lucide-react'
import type { Business } from '@/lib/types'

const CATEGORIES = [
  'Beauty & Wellness', 'Hair & Barber', 'Nail & Spa', 'Fitness & Yoga',
  'Massage & Therapy', 'Tattoo & Piercing', 'Makeup & Styling', 'Other',
]

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

interface HoursDraft { open: boolean; start: string; end: string }

const MAX_PHOTOS = 8

/** "10:00-20:00" | "closed" | undefined → editable draft. */
function toDraft(value: string | undefined): HoursDraft {
  if (!value || value === 'closed') return { open: false, start: '10:00', end: '20:00' }
  const [start, end] = value.split('-')
  return { open: true, start: start ?? '10:00', end: end ?? '20:00' }
}

function draftsToHours(drafts: Record<DayKey, HoursDraft>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const d of DAY_ORDER) {
    out[d] = drafts[d].open ? `${drafts[d].start}-${drafts[d].end}` : 'closed'
  }
  return out
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-4">
      <h2 className="text-sm font-bold text-bridge-heading">{title}</h2>
      {hint && <p className="text-xs text-bridge-muted mt-0.5 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  )
}

const inputClass =
  'w-full border border-bridge-border rounded-xl px-4 py-3 text-sm bg-bridge-card text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent'

export default function SettingsTab({ business }: { business: Business }) {
  const router = useRouter()

  // About
  const [name, setName] = useState(business.name)
  const [category, setCategory] = useState(business.category)
  const [location, setLocation] = useState(business.location)
  const [description, setDescription] = useState(business.description ?? '')

  // Contact
  const [contactPhone, setContactPhone] = useState(business.contactPhone ?? '')
  const [contactWhatsapp, setContactWhatsapp] = useState(business.contactWhatsapp ?? '')
  const [contactLine, setContactLine] = useState(business.contactLine ?? '')

  // Hours
  const [hours, setHours] = useState<Record<DayKey, HoursDraft>>(() => {
    const out = {} as Record<DayKey, HoursDraft>
    for (const d of DAY_ORDER) out[d] = toDraft(business.openingHours?.[d])
    return out
  })

  // Photos
  const [photos, setPhotos] = useState<string[]>(business.photos ?? [])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasContact = (contactPhone + contactWhatsapp + contactLine).trim().length > 0
  const canSave = name.trim().length > 0 && category && location.trim().length > 0 && hasContact && !saving

  function updateDay(d: DayKey, change: Partial<HoursDraft>) {
    setHours({ ...hours, [d]: { ...hours[d], ...change } })
  }

  function setAllSame() {
    const m = hours.mon
    const next = {} as Record<DayKey, HoursDraft>
    for (const d of DAY_ORDER) next[d] = { ...m }
    setHours(next)
  }

  async function uploadPhotos(files: File[]) {
    if (uploading) return
    const remaining = MAX_PHOTOS - photos.length
    const batch = files.filter((f) => f.type.startsWith('image/')).slice(0, remaining)
    if (batch.length === 0) return
    setUploading(true)
    setError(null)
    try {
      for (const file of batch) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/businesses/${business.slug}/photos`, { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Upload failed')
        setPhotos((p) => [...p, data.url])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function makeCover(i: number) {
    if (i === 0) return
    setPhotos((p) => [p[i], ...p.filter((_, idx) => idx !== i)])
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/businesses/${business.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          location: location.trim(),
          description: description.trim(),
          contactPhone,
          contactWhatsapp,
          contactLine,
          photos,
          openingHours: draftsToHours(hours),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* About */}
      <Section title="About" hint="Shown at the top of your booking page.">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-bridge-text mb-1">Business name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-bridge-text mb-1">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                    category === c
                      ? 'border-bridge-accent bg-bridge-accent text-white'
                      : 'border-bridge-border text-bridge-secondary bg-bridge-card hover:border-bridge-accent-light'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-bridge-text mb-1">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Street, area, city" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-bridge-text mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className={`${inputClass} resize-none`}
              placeholder="What makes your place special?"
            />
          </div>
        </div>
      </Section>

      {/* Photos */}
      <Section title="Photos" hint="The first photo is your cover. Up to 8.">
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((p, i) => (
              <div key={`${p}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-bridge-border/60 group">
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
                      onClick={() => makeCover(i)}
                      title="Make cover"
                      className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => removePhoto(i)}
                    title="Remove"
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
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              onDragOver={(e) => {
                e.preventDefault()
                if (!uploading) setDragOver(true)
              }}
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
      </Section>

      {/* Contact */}
      <Section title="Contact" hint="At least one — customers use these to reach you.">
        <div className="space-y-2">
          <div className="relative">
            <Phone size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-bridge-muted" />
            <input
              type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Phone number" className={`${inputClass} pl-10`}
            />
          </div>
          <div className="relative">
            <MessageCircle size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600" />
            <input
              type="tel" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="WhatsApp number" className={`${inputClass} pl-10`}
            />
          </div>
          <div className="relative">
            <MessageCircle size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-bridge-muted" />
            <input
              type="text" value={contactLine} onChange={(e) => setContactLine(e.target.value)}
              placeholder="LINE ID (e.g. @yourshop)" autoCapitalize="none" autoCorrect="off"
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>
      </Section>

      {/* Opening hours */}
      <Section title="Opening hours" hint="Used to compute available booking slots.">
        <div className="flex justify-end mb-2">
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
      </Section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <button
        disabled={!canSave}
        onClick={save}
        className="w-full py-3.5 rounded-2xl bg-bridge-ink text-bridge-ink-foreground font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99] transition-all flex items-center justify-center gap-2"
      >
        {saving ? (
          <><Loader2 size={15} className="animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check size={15} /> Saved</>
        ) : (
          'Save changes'
        )}
      </button>
      {!hasContact && (
        <p className="text-xs text-bridge-muted text-center -mt-2">Add at least one contact method to save.</p>
      )}
    </div>
  )
}
