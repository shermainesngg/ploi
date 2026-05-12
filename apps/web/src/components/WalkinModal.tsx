'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, User as UserIcon } from 'lucide-react'

interface ServiceOption {
  id: string
  name: string
  duration: number
  price: number
}

interface StaffOption {
  id: string
  name: string
  serviceIds: string[]
}

export default function WalkinModal({
  businessSlug,
  services,
  staff,
  date,
  onClose,
}: {
  businessSlug: string
  services: ServiceOption[]
  staff: StaffOption[]
  date: string  // YYYY-MM-DD (the day this walk-in is being added to)
  onClose: () => void
}) {
  const router = useRouter()
  const now = new Date()
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')}`

  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? '')
  const [staffId, setStaffId] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [time, setTime] = useState(defaultTime)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eligibleStaff = serviceId
    ? staff.filter((s) => s.serviceIds.includes(serviceId))
    : []

  async function submit() {
    if (!serviceId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/businesses/${businessSlug}/walkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          staffId: staffId || undefined,
          customerName,
          bookingDate: date,
          bookingTime: time,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add walk-in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-bridge-border/60">
            <h2 className="font-bold text-bridge-heading text-lg">New walk-in</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-bridge-surface flex items-center justify-center">
              <X size={16} className="text-bridge-secondary" />
            </button>
          </div>

          <div className="px-5 py-4 overflow-y-auto space-y-4">
            <div>
              <label className="block text-xs font-semibold text-bridge-text mb-1.5">
                Service <span className="text-bridge-accent">*</span>
              </label>
              <div className="space-y-1.5">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                      serviceId === s.id
                        ? 'border-bridge-accent bg-bridge-accent-wash'
                        : 'border-bridge-border bg-white hover:border-bridge-accent-light'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm text-bridge-heading">{s.name}</span>
                      <span className="text-xs text-bridge-muted">{s.duration} min · ฿{s.price.toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {eligibleStaff.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-bridge-text mb-1.5">
                  Staff <span className="text-bridge-muted font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStaffId('')}
                    className={`p-2 rounded-xl border text-sm text-left transition-all ${
                      !staffId ? 'border-bridge-accent bg-bridge-accent-wash text-bridge-accent' : 'border-bridge-border text-bridge-secondary'
                    }`}
                  >
                    <UserIcon size={13} className="inline-block mr-1" /> Any
                  </button>
                  {eligibleStaff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStaffId(s.id)}
                      className={`p-2 rounded-xl border text-sm text-left transition-all ${
                        staffId === s.id ? 'border-bridge-accent bg-bridge-accent-wash text-bridge-accent' : 'border-bridge-border text-bridge-secondary'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-bridge-text mb-1.5">Time</label>
                <input
                  type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full border border-bridge-border rounded-xl px-3 py-2.5 text-bridge-heading focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-bridge-text mb-1.5">Date</label>
                <input
                  type="date" value={date} disabled
                  className="w-full border border-bridge-border rounded-xl px-3 py-2.5 text-bridge-muted bg-bridge-bg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-bridge-text mb-1.5">
                Customer name <span className="text-bridge-muted font-normal">(optional)</span>
              </label>
              <input
                type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Lia"
                className="w-full border border-bridge-border rounded-xl px-3 py-2.5 text-bridge-heading placeholder:text-bridge-muted focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent text-sm"
              />
            </div>

            {error && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</p>}

            <button
              onClick={submit}
              disabled={!serviceId || busy}
              className="w-full py-3.5 rounded-2xl bg-bridge-accent text-white font-semibold text-sm disabled:opacity-30 hover:bg-bridge-accent-dark flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> {busy ? 'Adding…' : 'Add walk-in'}
            </button>

            <p className="text-center text-[11px] text-bridge-muted">
              Walk-ins are direct customers — no creator attribution.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
