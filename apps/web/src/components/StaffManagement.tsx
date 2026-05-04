'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Image as ImageIcon, Save, X, Pencil, User as UserIcon,
  Copy, ExternalLink, Calendar, Check,
} from 'lucide-react'
import type { StaffMember } from '@/lib/db'

interface ServiceOption {
  id: string
  name: string
  duration: number
  price: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface ScheduleDraft {
  open: boolean
  start: string
  end: string
}

interface BlockDraft {
  id?: string
  blockDate: string
  reason: string
}

const DEFAULT_HOURS: Record<number, ScheduleDraft> = {
  0: { open: false, start: '10:00', end: '18:00' },
  1: { open: true, start: '10:00', end: '18:00' },
  2: { open: true, start: '10:00', end: '18:00' },
  3: { open: true, start: '10:00', end: '18:00' },
  4: { open: true, start: '10:00', end: '18:00' },
  5: { open: true, start: '10:00', end: '18:00' },
  6: { open: false, start: '10:00', end: '18:00' },
}

function parseBusinessHours(opening: Record<string, string> | null) {
  const KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const out: Record<number, ScheduleDraft> = {}
  for (let i = 0; i < 7; i++) {
    const v = opening?.[KEYS[i]]
    if (!v || v === 'closed') {
      out[i] = { ...DEFAULT_HOURS[i], open: false }
    } else {
      const [s, e] = v.split('-')
      out[i] = { open: true, start: s ?? '10:00', end: e ?? '18:00' }
    }
  }
  return out
}

// ── Main entry ──────────────────────────────────────────────────────────────

export default function StaffManagement({
  businessSlug,
  businessName,
  services,
  businessHours,
  initialStaff,
}: {
  businessSlug: string
  businessName: string
  services: ServiceOption[]
  businessHours: Record<string, string> | null
  initialStaff: StaffMember[]
}) {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null)

  async function refresh() {
    const res = await fetch(`/api/businesses/${businessSlug}/staff`)
    const data = await res.json()
    setStaff(Array.isArray(data) ? data : [])
    router.refresh()
  }

  if (editing) {
    return (
      <StaffEditor
        businessSlug={businessSlug}
        services={services}
        businessHours={businessHours}
        staff={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={async () => { await refresh(); setEditing(null) }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[480px] mx-auto pb-24">
        <div className="px-5 pt-8 pb-6 bg-white border-b border-stone-100">
          <Link
            href={`/dashboard/business/${businessSlug}`}
            className="flex items-center gap-1 text-stone-400 text-xs mb-3 hover:text-stone-600"
          >
            <ArrowLeft size={12} /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-black text-stone-900 leading-tight">Staff</h1>
          <p className="text-stone-500 text-sm mt-1">Manage who works at {businessName}.</p>
        </div>

        <div className="px-4 mt-6">
          <button
            onClick={() => setEditing('new')}
            className="w-full py-3 rounded-2xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mb-4"
          >
            <Plus size={16} /> Add staff member
          </button>

          {staff.map((s) => (
            <StaffCard
              key={s.id}
              staff={s}
              services={services}
              businessSlug={businessSlug}
              onEdit={() => setEditing(s)}
            />
          ))}

          {staff.length === 0 && (
            <div className="text-center py-12 text-stone-400 text-sm">
              No staff yet. Adding staff lets customers pick a preferred therapist or stylist when they book.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StaffCard({
  staff, services, businessSlug, onEdit,
}: {
  staff: StaffMember
  services: ServiceOption[]
  businessSlug: string
  onEdit: () => void
}) {
  const assigned = services.filter((s) => staff.serviceIds.includes(s.id))
  const scheduleUrl = typeof window !== 'undefined' ? `${window.location.origin}/staff/${staff.id}/schedule` : ''
  const [copied, setCopied] = useState(false)

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(scheduleUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 mb-3">
      <button onClick={onEdit} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden bg-stone-100 flex items-center justify-center">
            {staff.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={20} className="text-stone-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-900 text-sm truncate">{staff.name}</p>
            {staff.role && <p className="text-stone-500 text-xs">{staff.role}</p>}
            <p className="text-stone-400 text-[11px] mt-1 truncate">
              {assigned.length > 0
                ? `${assigned.length} service${assigned.length !== 1 ? 's' : ''} · ${assigned.slice(0, 2).map((s) => s.name).join(', ')}${assigned.length > 2 ? '…' : ''}`
                : 'No services assigned yet'}
            </p>
          </div>
          <Pencil size={14} className="text-stone-300 flex-shrink-0 mt-1" />
        </div>
      </button>

      {/* Footer: schedule link */}
      <div className="border-t border-stone-100 mt-3 pt-3 flex items-center gap-2">
        <Link
          href={`/staff/${staff.id}/schedule`}
          className="flex-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg py-1.5 px-2 flex items-center justify-center gap-1.5"
        >
          <Calendar size={11} /> View schedule
        </Link>
        <button
          onClick={copyLink}
          className="flex-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg py-1.5 px-2 flex items-center justify-center gap-1.5"
        >
          <Copy size={11} /> {copied ? 'Copied' : 'Copy private link'}
        </button>
      </div>
    </div>
  )
}

// ── Editor ─────────────────────────────────────────────────────────────────

function StaffEditor({
  businessSlug, services, businessHours, staff, onClose, onSaved,
}: {
  businessSlug: string
  services: ServiceOption[]
  businessHours: Record<string, string> | null
  staff: StaffMember | null
  onClose: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(staff?.name ?? '')
  const [role, setRole] = useState(staff?.role ?? '')
  const [photoUrl, setPhotoUrl] = useState(staff?.photoUrl ?? '')
  const [serviceIds, setServiceIds] = useState<string[]>(staff?.serviceIds ?? [])
  const [hours, setHours] = useState<Record<number, ScheduleDraft>>(parseBusinessHours(businessHours))
  const [scheduleLoaded, setScheduleLoaded] = useState(!staff)
  const [blocks, setBlocks] = useState<BlockDraft[]>([])
  const [newBlockDate, setNewBlockDate] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNew = !staff

  // Load existing schedule + blocks for an existing staff
  useEffect(() => {
    if (!staff) return
    Promise.all([
      fetch(`/api/staff/${staff.id}/schedule`).then((r) => r.json()),
      fetch(`/api/staff/${staff.id}/blocks`).then((r) => r.json()),
    ])
      .then(([schedule, blockList]) => {
        if (Array.isArray(schedule) && schedule.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const next: Record<number, ScheduleDraft> = { ...hours }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const r of schedule as any[]) {
            next[r.dayOfWeek] = {
              open: r.isAvailable,
              start: r.startTime,
              end: r.endTime,
            }
          }
          setHours(next)
        }
        if (Array.isArray(blockList)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setBlocks(blockList.map((b: any) => ({
            id: b.id, blockDate: b.blockDate, reason: b.reason ?? '',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setScheduleLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id])

  function toggleService(id: string) {
    setServiceIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  function setDay(dow: number, change: Partial<ScheduleDraft>) {
    setHours({ ...hours, [dow]: { ...hours[dow], ...change } })
  }

  function copyToAllDays() {
    const monday = hours[1]
    const next: Record<number, ScheduleDraft> = {}
    for (let i = 0; i < 7; i++) next[i] = { ...monday }
    setHours(next)
  }

  async function save() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      let staffId = staff?.id ?? null

      if (isNew) {
        const res = await fetch(`/api/businesses/${businessSlug}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, role, photoUrl, serviceIds }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not create staff')
        staffId = data.id
      } else {
        const res = await fetch(`/api/businesses/${businessSlug}/staff/${staffId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, role, photoUrl, serviceIds }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Could not update staff')
        }
      }

      // Save schedule
      const schedule = Object.entries(hours).map(([dow, h]) => ({
        dayOfWeek: Number(dow),
        startTime: h.start,
        endTime: h.end,
        isAvailable: h.open,
      }))
      await fetch(`/api/staff/${staffId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      })

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function addBlock() {
    if (!staff || !newBlockDate) return
    const res = await fetch(`/api/staff/${staff.id}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockDate: newBlockDate, reason: newBlockReason }),
    })
    const data = await res.json()
    if (res.ok) {
      setBlocks([...blocks, { id: data.id, blockDate: data.blockDate, reason: data.reason ?? '' }])
      setNewBlockDate('')
      setNewBlockReason('')
    }
  }

  async function removeBlock(blockId: string) {
    if (!staff) return
    await fetch(`/api/staff/${staff.id}/blocks/${blockId}`, { method: 'DELETE' })
    setBlocks(blocks.filter((b) => b.id !== blockId))
  }

  async function deleteStaff() {
    if (!staff) return
    if (!confirm('Remove this staff member? They won\'t take new bookings.')) return
    setSaving(true)
    try {
      await fetch(`/api/businesses/${businessSlug}/staff/${staff.id}`, { method: 'DELETE' })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[480px] mx-auto pb-32">
        <div className="px-5 pt-8 pb-6 bg-white border-b border-stone-100">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-stone-400 text-xs mb-3 hover:text-stone-600"
          >
            <ArrowLeft size={12} /> Back to staff list
          </button>
          <h1 className="text-2xl font-black text-stone-900 leading-tight">
            {isNew ? 'New staff member' : staff!.name}
          </h1>
        </div>

        {/* Profile */}
        <Section title="Profile">
          <Field label="Name" required>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pim"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
            />
          </Field>
          <Field label="Role">
            <input
              type="text" value={role} onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior therapist"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
            />
          </Field>
          <Field label="Photo URL">
            <div className="relative">
              <ImageIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://…"
                autoCapitalize="none" autoCorrect="off"
                className="w-full border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs font-mono"
              />
            </div>
          </Field>
        </Section>

        {/* Services — interactive button toggles */}
        <Section title="Services">
          <p className="text-stone-500 text-xs mb-3">Tap the services this person can perform.</p>
          {services.length === 0 ? (
            <p className="text-stone-400 text-xs">Add services to your business first.</p>
          ) : (
            <div className="space-y-2">
              {services.map((s) => {
                const on = serviceIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                      on
                        ? 'border-rose-600 bg-rose-50'
                        : 'border-stone-200 bg-white hover:border-rose-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center ${
                        on ? 'bg-rose-600' : 'border-2 border-stone-300 bg-white'
                      }`}
                    >
                      {on && <Check size={13} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${on ? 'text-rose-700' : 'text-stone-900'}`}>{s.name}</p>
                      <p className="text-xs text-stone-500">{s.duration} min · ฿{s.price.toLocaleString()}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Section>

        {/* Schedule */}
        <Section
          title="Weekly schedule"
          action={
            <button
              onClick={copyToAllDays}
              className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md flex items-center gap-1"
            >
              <Copy size={11} /> Mon → all days
            </button>
          }
        >
          {!scheduleLoaded ? (
            <p className="text-stone-400 text-xs py-4">Loading…</p>
          ) : (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 divide-y divide-stone-200">
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                <div key={dow} className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-sm font-semibold text-stone-700 w-10">{DAY_LABELS[dow]}</span>
                  <button
                    type="button"
                    onClick={() => setDay(dow, { open: !hours[dow].open })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      hours[dow].open ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {hours[dow].open ? 'On' : 'Off'}
                  </button>
                  {hours[dow].open && (
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="time"
                        value={hours[dow].start}
                        onChange={(e) => setDay(dow, { start: e.target.value })}
                        className="border border-stone-200 rounded-md px-1.5 py-1 text-xs bg-white"
                      />
                      <span className="text-stone-400 text-xs">–</span>
                      <input
                        type="time"
                        value={hours[dow].end}
                        onChange={(e) => setDay(dow, { end: e.target.value })}
                        className="border border-stone-200 rounded-md px-1.5 py-1 text-xs bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Blocked dates — only for existing staff */}
        {!isNew && (
          <Section title="Blocked dates">
            <p className="text-stone-500 text-xs mb-3">Sick days, leave, or any date this person is fully unavailable.</p>

            <div className="space-y-2 mb-3">
              {blocks.map((b) => (
                <div key={b.id ?? b.blockDate} className="bg-stone-50 rounded-xl border border-stone-200 p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900">{b.blockDate}</p>
                    {b.reason && <p className="text-xs text-stone-500">{b.reason}</p>}
                  </div>
                  {b.id && (
                    <button
                      onClick={() => removeBlock(b.id!)}
                      className="text-stone-300 hover:text-rose-500 ml-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {blocks.length === 0 && (
                <p className="text-stone-400 text-xs italic">No blocked dates.</p>
              )}
            </div>

            <div className="bg-rose-50 rounded-2xl p-3 space-y-2 border border-rose-100">
              <input
                type="date" value={newBlockDate} onChange={(e) => setNewBlockDate(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
              />
              <input
                type="text" value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)}
                placeholder="Reason (optional, e.g. Sick day)"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
              />
              <button
                type="button"
                onClick={addBlock}
                disabled={!newBlockDate}
                className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-30 flex items-center justify-center gap-1.5"
              >
                <Plus size={13} /> Add blocked date
              </button>
            </div>
          </Section>
        )}

        {/* Save bar (sticky bottom) */}
        <div className="fixed bottom-0 left-0 right-0 z-20 max-w-[480px] mx-auto px-4 py-3 bg-white border-t border-stone-200">
          {error && <p className="text-red-600 text-xs mb-2 text-center">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="flex-1 py-3.5 rounded-xl bg-rose-600 text-white font-semibold text-sm disabled:opacity-30 hover:bg-rose-700 flex items-center justify-center gap-1.5"
            >
              <Save size={14} /> {saving ? 'Saving…' : isNew ? 'Create staff' : 'Save changes'}
            </button>
            {!isNew && (
              <button
                onClick={deleteStaff}
                disabled={saving}
                className="px-4 py-3.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-30 flex items-center gap-1"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title, action, children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">{title}</h2>
        {action}
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({
  label, required, children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-700 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}
