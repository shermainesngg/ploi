'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

/**
 * Customer-facing accept/decline for a business-proposed reschedule.
 * Authorised by the capability token from the email link.
 */
export default function RescheduleResponse({
  bookingId,
  token,
}: {
  bookingId: string
  token: string
}) {
  const [busy, setBusy] = useState<null | 'accept' | 'decline'>(null)
  const [done, setDone] = useState<null | 'accept' | 'decline'>(null)
  const [error, setError] = useState<string | null>(null)

  async function respond(action: 'accept' | 'decline') {
    if (busy) return
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(action)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  if (done) {
    return (
      <div className="mt-5 bg-bridge-card rounded-2xl border border-bridge-border/60 p-6 text-center shadow-card">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
          done === 'accept' ? 'bg-bridge-accent-soft text-bridge-accent' : 'bg-bridge-surface text-bridge-secondary'
        }`}>
          {done === 'accept' ? <Check size={22} strokeWidth={3} /> : <X size={22} />}
        </div>
        <p className="font-bold text-bridge-heading text-body-lg">
          {done === 'accept' ? "You're confirmed!" : 'Proposal declined'}
        </p>
        <p className="text-bridge-muted text-body mt-1">
          {done === 'accept'
            ? 'Your booking has been moved to the new time. See you there!'
            : 'No problem — your original request still stands and the business has been notified.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-5">
      {error && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">{error}</p>}
      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={() => respond('accept')}
          disabled={!!busy}
          className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-body disabled:opacity-40 hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Check size={17} /> {busy === 'accept' ? 'Confirming…' : 'Accept new time'}
        </button>
        <button
          onClick={() => respond('decline')}
          disabled={!!busy}
          className="w-full py-3.5 rounded-2xl border border-bridge-border text-bridge-secondary font-semibold text-body disabled:opacity-40 hover:bg-bridge-surface transition-colors flex items-center justify-center gap-2"
        >
          <X size={16} /> {busy === 'decline' ? 'Sending…' : "This time doesn't work"}
        </button>
      </div>
    </div>
  )
}
