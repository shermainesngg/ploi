'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight, ArrowLeft, Check, Info } from 'lucide-react'

interface AvailabilityResult {
  date: string
  closed: boolean
  hours: string | null
  groups: Array<{ label: string; slots: Array<{ time: string; available: boolean }> }>
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getUpcomingDates(count: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

export default function RescheduleModal({
  bookingId,
  businessSlug,
  serviceId,
  serviceName,
  currentDate,
  currentTime,
  onClose,
  mode = 'direct',
}: {
  bookingId: string
  businessSlug: string
  serviceId: string | null
  serviceName: string
  currentDate: string
  currentTime: string
  onClose: () => void
  /**
   * 'direct'  — apply the new slot immediately (confirmed bookings).
   * 'propose' — send the slot to the customer to accept/decline (pending bookings).
   */
  mode?: 'direct' | 'propose'
}) {
  const router = useRouter()
  const isPropose = mode === 'propose'
  const [step, setStep] = useState<'date' | 'time'>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dates = getUpcomingDates(14)

  useEffect(() => {
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    setLoading(true)
    setAvailability(null)
    setSelectedTime(null)
    const url = `/api/businesses/${businessSlug}/availability?date=${dateStr}${serviceId ? `&serviceId=${serviceId}` : ''}`
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setAvailability(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedDate, businessSlug, serviceId])

  async function submit() {
    if (!selectedDate || !selectedTime) return
    setSubmitting(true)
    setError(null)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const res = isPropose
        ? await fetch(`/api/bookings/${bookingId}/propose-reschedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingDate: dateStr, bookingTime: selectedTime }),
          })
        : await fetch(`/api/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingDate: dateStr, bookingTime: selectedTime }),
          })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? (isPropose ? 'Could not send proposal' : 'Could not reschedule'))
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : (isPropose ? 'Could not send proposal' : 'Could not reschedule'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-[480px] bg-bridge-card rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-scale-in pointer-events-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-bridge-border/60">
            <div>
              {step === 'time' && (
                <button
                  onClick={() => setStep('date')}
                  className="flex items-center gap-1 text-bridge-muted text-sm mb-1 hover:text-bridge-secondary"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <h2 className="font-bold text-bridge-heading text-lg leading-tight">
                {isPropose ? 'Propose new time' : 'Reschedule'}
              </h2>
              <p className="text-bridge-muted text-sm">{serviceName}</p>
              <p className="text-bridge-border-strong text-xs">
                Currently: {currentDate} at {currentTime}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-bridge-surface hover:bg-bridge-surface">
              <X size={16} className="text-bridge-secondary" />
            </button>
          </div>

          <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
            {step === 'date' && (
              <div>
                <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-4">New Date</p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {dates.map((d) => {
                    const isSel = selectedDate?.toDateString() === d.toDateString()
                    const isToday = d.toDateString() === new Date().toDateString()
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => setSelectedDate(d)}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border-2 transition-all ${
                          isSel ? 'border-bridge-accent bg-bridge-accent text-white' : 'border-bridge-border bg-bridge-card text-bridge-text hover:border-bridge-accent-light'
                        }`}
                      >
                        <span className={`text-xs mb-1 ${isSel ? 'text-white/70' : 'text-bridge-muted'}`}>{DAY_NAMES[d.getDay()]}</span>
                        <span className="text-xl font-bold leading-none">{d.getDate()}</span>
                        <span className={`text-xs mt-1 ${isSel ? 'text-white/70' : 'text-bridge-muted'}`}>
                          {isToday ? 'Today' : MONTH_NAMES[d.getMonth()]}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <button
                  disabled={!selectedDate}
                  onClick={() => setStep('time')}
                  className="w-full mt-6 py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            )}

            {step === 'time' && (
              <div>
                <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-4">
                  New Time {selectedDate && `· ${DAY_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]}`}
                </p>

                {/* Disclaimer — the proposed slot is the business's responsibility to honour */}
                <div className="flex items-start gap-2 bg-bridge-surface border border-bridge-border/60 rounded-xl p-3 mb-4">
                  <Info size={14} className="text-bridge-muted flex-shrink-0 mt-0.5" />
                  <p className="text-bridge-secondary text-xs leading-relaxed">
                    Please ensure that this slot is available.
                    {isPropose && ' The customer will be asked to accept it before the booking moves.'}
                  </p>
                </div>

                {loading && <p className="text-bridge-muted text-sm py-8 text-center">Checking availability…</p>}

                {!loading && availability?.closed && (
                  <p className="text-center py-8 text-bridge-muted text-sm">Closed this day. Pick another date.</p>
                )}

                {!loading && availability && !availability.closed && availability.groups.length === 0 && (
                  <p className="text-center py-8 text-bridge-muted text-sm">No slots available — try another date.</p>
                )}

                {!loading && availability?.groups.map(({ label, slots }) => {
                  const anyAvail = slots.some((s) => s.available)
                  return (
                    <div key={label} className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-bridge-muted">{label}</p>
                        {!anyAvail && <p className="text-[10px] text-bridge-border-strong uppercase">Fully booked</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {slots.map(({ time, available }) => {
                          const isSel = selectedTime === time
                          return (
                            <button
                              key={time}
                              disabled={!available}
                              onClick={() => setSelectedTime(time)}
                              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                !available ? 'border-bridge-border/60 text-bridge-border-strong cursor-not-allowed bg-bridge-bg'
                                : isSel ? 'border-bridge-accent bg-bridge-accent text-white'
                                : 'border-bridge-border text-bridge-text bg-bridge-card hover:border-bridge-accent-light'
                              }`}
                            >
                              {time}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {error && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</p>}

                <button
                  disabled={!selectedTime || submitting}
                  onClick={submit}
                  className="w-full mt-2 py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Check size={16} /> {submitting
                    ? (isPropose ? 'Sending…' : 'Saving…')
                    : (isPropose ? 'Send proposal to customer' : 'Confirm reschedule')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
