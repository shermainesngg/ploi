'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'
import {
  MapPin, Plus, Phone, MessageCircle, Pencil, Trash2,
  Check, Loader2, Star,
} from 'lucide-react'
import type { Business, Location } from '@/lib/types'
import { Modal } from '@/components/ui'
import HoursEditor from './HoursEditor'

const inputClass =
  'w-full border border-bridge-border rounded-xl px-4 py-3 text-sm bg-bridge-card text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent'

interface EditorState {
  id: string | null            // null = creating
  name: string
  address: string
  openingHours: Record<string, string> | null
  contactPhone: string
  contactWhatsapp: string
  contactLine: string
}

function blankEditor(): EditorState {
  return {
    id: null, name: '', address: '',
    openingHours: null, contactPhone: '', contactWhatsapp: '', contactLine: '',
  }
}

function editorFor(loc: Location): EditorState {
  return {
    id: loc.id,
    name: loc.name ?? '',
    address: loc.address,
    openingHours: loc.openingHours,
    contactPhone: loc.contactPhone ?? '',
    contactWhatsapp: loc.contactWhatsapp ?? '',
    contactLine: loc.contactLine ?? '',
  }
}

export default function LocationsTab({ business }: { business: Business }) {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>(business.locations ?? [])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function refetch() {
    try {
      const res = await fetch(`/api/businesses/${business.slug}/locations`)
      const data = await res.json()
      if (res.ok) setLocations(data.locations ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    if (!editor) return
    if (editor.address.trim().length === 0) {
      setError('Address is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: editor.name.trim(),
        address: editor.address.trim(),
        openingHours: editor.openingHours ?? undefined,
        contactPhone: editor.contactPhone.trim(),
        contactWhatsapp: editor.contactWhatsapp.trim(),
        contactLine: editor.contactLine.trim(),
      }
      const res = editor.id
        ? await fetch(`/api/businesses/${business.slug}/locations/${editor.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/businesses/${business.slug}/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      setEditor(null)
      await refetch()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function remove(loc: Location) {
    if (!confirm(`Remove ${loc.name || loc.address}? This branch will no longer accept bookings.`)) return
    setRemovingId(loc.id)
    try {
      const res = await fetch(`/api/businesses/${business.slug}/locations/${loc.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not remove')
      await refetch()
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not remove')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-bridge-heading">Locations</h2>
          <p className="text-xs text-bridge-muted mt-0.5">
            Each branch has its own address, hours, and staff. Customers pick a branch when booking.
          </p>
        </div>
        <button
          onClick={() => { setError(null); setEditor(blankEditor()) }}
          className="flex-shrink-0 flex items-center gap-1 text-caption font-semibold text-white bg-bridge-accent hover:bg-bridge-accent-dark px-2.5 py-1.5 rounded-button transition-colors"
        >
          <Plus size={12} /> Add branch
        </button>
      </div>

      {loading && locations.length === 0 ? (
        <div className="py-10 flex justify-center text-bridge-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-bridge-surface flex items-center justify-center flex-shrink-0">
                  <MapPin size={15} className="text-bridge-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-bridge-heading">
                      {loc.name || (loc.isPrimary ? 'Main location' : 'Branch')}
                    </span>
                    {loc.isPrimary && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-bridge-ink-static/10 text-bridge-secondary px-1.5 py-0.5 rounded-full">
                        <Star size={9} /> Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-bridge-muted mt-0.5">{loc.address}</p>
                  {(loc.contactPhone || loc.contactWhatsapp || loc.contactLine) && (
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-bridge-secondary">
                      {loc.contactPhone && (
                        <span className="inline-flex items-center gap-1"><Phone size={10} /> {loc.contactPhone}</span>
                      )}
                      {(loc.contactWhatsapp || loc.contactLine) && (
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle size={10} /> {loc.contactWhatsapp || loc.contactLine}
                        </span>
                      )}
                    </div>
                  )}

                  {loc.isPrimary ? (
                    <p className="text-[11px] text-bridge-muted mt-2">
                      Main details (address, hours, contacts) are managed in{' '}
                      <NextLink href="?tab=settings" scroll={false} className="font-semibold text-bridge-accent">
                        Settings
                      </NextLink>.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => { setError(null); setEditor(editorFor(loc)) }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-bridge-secondary border border-bridge-border rounded-full px-2.5 py-1 hover:border-bridge-border-strong transition-colors"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        onClick={() => remove(loc)}
                        disabled={removingId === loc.id}
                        className="flex items-center gap-1 text-[11px] font-semibold text-red-600 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {removingId === loc.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editor !== null}
        onClose={() => { if (!saving) setEditor(null) }}
        title={editor?.id ? 'Edit branch' : 'Add branch'}
      >
        {editor && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-bridge-text mb-1">Branch name</label>
              <input
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Thonglor"
              />
              <p className="text-[11px] text-bridge-muted mt-1">Optional — helps customers tell branches apart.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-bridge-text mb-1">Address</label>
              <input
                value={editor.address}
                onChange={(e) => setEditor({ ...editor, address: e.target.value })}
                className={inputClass}
                placeholder="Street, area, city"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-bridge-text mb-2">Opening hours</label>
              <HoursEditor
                value={editor.openingHours}
                onChange={(h) => setEditor((prev) => (prev ? { ...prev, openingHours: h } : prev))}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-bridge-text">Contact (optional — falls back to main)</label>
              <div className="relative">
                <Phone size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-bridge-muted" />
                <input
                  type="tel" value={editor.contactPhone}
                  onChange={(e) => setEditor({ ...editor, contactPhone: e.target.value })}
                  placeholder="Phone number" className={`${inputClass} pl-10`}
                />
              </div>
              <div className="relative">
                <MessageCircle size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600" />
                <input
                  type="tel" value={editor.contactWhatsapp}
                  onChange={(e) => setEditor({ ...editor, contactWhatsapp: e.target.value })}
                  placeholder="WhatsApp number" className={`${inputClass} pl-10`}
                />
              </div>
              <div className="relative">
                <MessageCircle size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-bridge-muted" />
                <input
                  type="text" value={editor.contactLine}
                  onChange={(e) => setEditor({ ...editor, contactLine: e.target.value })}
                  placeholder="LINE ID (e.g. @yourshop)" autoCapitalize="none" autoCorrect="off"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">{error}</div>
            )}

            <button
              disabled={saving || editor.address.trim().length === 0}
              onClick={save}
              className="w-full py-3 rounded-2xl bg-bridge-ink text-bridge-ink-foreground font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                <><Check size={15} /> {editor.id ? 'Save branch' : 'Add branch'}</>
              )}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
