'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, CalendarClock, Clock, MapPin, Repeat, X } from 'lucide-react'
import RescheduleModal from './RescheduleModal'
import RescheduleResponse from './RescheduleResponse'
import { isProposalLive } from '@/lib/reschedule'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawBooking = any

export default function BookingsList({ bookings, userEmail }: { bookings: RawBooking[]; userEmail: string }) {
  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter((b) => b.booking_date >= today)
  const past = bookings.filter((b) => b.booking_date < today)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <h1 className="text-2xl font-bold text-bridge-heading px-1">My bookings</h1>
      <p className="text-bridge-muted text-sm mt-1 px-1">Booked under {userEmail}</p>

      {bookings.length === 0 ? (
        <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-8 mt-6 text-center">
          <p className="text-bridge-muted text-sm mb-4">No bookings yet.</p>
          <Link href="/" className="text-bridge-accent font-semibold text-sm hover:underline">Browse places →</Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-3 px-1">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((b) => <BookingRow key={b.id} booking={b} canChange />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-3 px-1">Past</h2>
              <div className="space-y-2">
                {past.map((b) => <BookingRow key={b.id} booking={b} canChange={false} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function BookingRow({ booking, canChange }: { booking: RawBooking; canChange: boolean }) {
  const router = useRouter()
  const svc = Array.isArray(booking.services) ? booking.services[0] : booking.services
  const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
  const date = new Date(booking.booking_date)
  const time = (booking.booking_time as string)?.slice(0, 5)

  const status = booking.status as string
  const paid = booking.payment_status === 'paid'
  const isCancellable = canChange && status !== 'cancelled' && status !== 'declined' && status !== 'completed' && status !== 'no_show'

  // The business proposed a new time for this (still-pending) booking. Show an
  // in-app accept/decline banner — the same capability the email link carries.
  const proposalLive = isProposalLive(booking)
  const proposedTime = (booking.reschedule_proposed_time as string)?.slice(0, 5)

  const [reschedOpen, setReschedOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function cancel() {
    if (!confirm('Cancel this booking? The slot will open back up.')) return
    setBusy(true)
    try {
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {proposalLive && (
        <div className="bg-bridge-accent-soft border border-bridge-accent/30 rounded-2xl p-4 mb-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-bridge-accent mb-2">
            <CalendarClock size={13} /> New time proposed
          </p>
          <p className="text-sm text-bridge-secondary">
            {biz?.name ?? 'The business'} suggested a new time for your {svc?.name ?? 'booking'}.
          </p>
          <div className="mt-3 space-y-0.5">
            <p className="text-xs text-bridge-muted line-through">
              {DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]} at {time}
            </p>
            <p className="text-sm font-bold text-bridge-heading">
              {(() => {
                const pd = new Date(`${booking.reschedule_proposed_date}T00:00:00`)
                return `${DAY_NAMES[pd.getDay()]} ${pd.getDate()} ${MONTH_NAMES[pd.getMonth()]} at ${proposedTime}`
              })()}
            </p>
          </div>
          <RescheduleResponse bookingId={booking.id} token={booking.reschedule_token} />
        </div>
      )}

      <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 shadow-sm overflow-hidden">
        <Link href={`/booking-confirmed/${booking.id}`} className="block p-4 hover:bg-bridge-surface/50 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-bridge-heading text-sm truncate">{svc?.name ?? 'Service'}</p>
                {paid && <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Paid</span>}
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                  status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-bridge-surface text-bridge-muted'
                }`}>{status}</span>
              </div>
              <p className="text-bridge-muted text-xs truncate">{biz?.name}</p>
            </div>
            <span className="font-bold text-bridge-heading text-sm flex-shrink-0">฿{(svc?.price ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-bridge-muted">
            <span className="flex items-center gap-1"><Calendar size={11} />{DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{time}</span>
            {biz?.location && <span className="flex items-center gap-1 truncate"><MapPin size={11} />{biz.location}</span>}
          </div>
        </Link>

        {isCancellable && (
          <div className="border-t border-bridge-border/60 flex divide-x divide-bridge-border/60">
            <button
              onClick={() => setReschedOpen(true)}
              disabled={busy}
              className="flex-1 py-2.5 text-xs font-semibold text-bridge-text hover:bg-bridge-surface flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Repeat size={12} /> Reschedule
            </button>
            <button
              onClick={cancel}
              disabled={busy}
              className="flex-1 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        )}
      </div>

      {reschedOpen && (
        <RescheduleModal
          bookingId={booking.id}
          businessSlug={biz?.slug ?? ''}
          serviceId={booking.service_id}
          serviceName={svc?.name ?? 'Service'}
          currentDate={booking.booking_date}
          currentTime={time}
          onClose={() => setReschedOpen(false)}
        />
      )}
    </>
  )
}
