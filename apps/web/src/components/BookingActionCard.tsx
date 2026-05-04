'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, X, MoreHorizontal, CalendarCheck, UserX, Repeat, User as UserIcon,
  Calendar, Clock,
} from 'lucide-react'
import type { AgendaBooking } from '@/lib/db'
import RescheduleModal from './RescheduleModal'

export interface StaffSummary {
  id: string
  name: string
  serviceIds: string[]
}

const STAFF_COLORS = [
  { bg: 'bg-rose-500', soft: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-blue-500', soft: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-500', soft: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-500', soft: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-purple-500', soft: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-pink-500', soft: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-cyan-500', soft: 'bg-cyan-100', text: 'text-cyan-700' },
]
const UNASSIGNED_COLOR = { bg: 'bg-stone-400', soft: 'bg-stone-100', text: 'text-stone-700' }

export function colorForStaff(staffId: string | null, allStaff: StaffSummary[]) {
  if (!staffId) return UNASSIGNED_COLOR
  const idx = allStaff.findIndex((s) => s.id === staffId)
  if (idx < 0) return UNASSIGNED_COLOR
  return STAFF_COLORS[idx % STAFF_COLORS.length]
}

export function statusStyles(status: AgendaBooking['status']) {
  switch (status) {
    case 'confirmed':  return 'text-green-700 bg-green-50'
    case 'pending':    return 'text-amber-700 bg-amber-50'
    case 'completed':  return 'text-blue-700 bg-blue-50'
    case 'cancelled':
    case 'declined':   return 'text-stone-500 bg-stone-100'
    case 'no_show':    return 'text-rose-600 bg-rose-50'
  }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

export default function BookingActionCard({
  booking,
  staff,
  businessSlug,
  expanded: controlledExpanded,
  onToggle,
  showDate = false,
}: {
  booking: AgendaBooking
  staff: StaffSummary[]
  businessSlug: string
  expanded?: boolean
  onToggle?: () => void
  /** Show the full date alongside the time (for non-daily contexts) */
  showDate?: boolean
}) {
  const router = useRouter()
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = controlledExpanded ?? internalExpanded
  const toggle = onToggle ?? (() => setInternalExpanded((v) => !v))

  const [busy, setBusy] = useState(false)
  const [reschedOpen, setReschedOpen] = useState(false)

  const col = colorForStaff(booking.staffId, staff)
  const isFinal = ['completed', 'cancelled', 'declined', 'no_show'].includes(booking.status)

  // Suggest the best staff for this booking
  const eligibleStaff = staff  // dashboard owner can override even with non-eligible staff

  async function setStatus(status: AgendaBooking['status']) {
    setBusy(true)
    try {
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function reassign(newStaffId: string | null) {
    setBusy(true)
    try {
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: newStaffId }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <button
          onClick={toggle}
          className="w-full text-left flex items-stretch gap-3 p-3 hover:bg-stone-50/50 transition-colors"
        >
          {/* Color rail */}
          <div className={`w-1 self-stretch rounded-full ${col.bg} flex-shrink-0`} />

          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-stone-900 text-sm leading-none">{booking.time}</p>
              <p className="text-[10px] text-stone-400 mt-0.5">{booking.endTime}</p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-stone-900 text-sm truncate">{booking.customerName}</p>
                {booking.isWalkin && (
                  <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Walk-in</span>
                )}
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${statusStyles(booking.status)}`}>
                  {booking.status === 'no_show' ? 'No-show' : booking.status}
                </span>
              </div>
              <p className="text-stone-500 text-xs truncate mt-0.5">{booking.serviceName}</p>
              <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-1 flex-wrap">
                <span>{formatPrice(booking.price)}</span>
                <span>·</span>
                {showDate && (
                  <>
                    <span>{formatDate(booking.date)}</span>
                    <span>·</span>
                  </>
                )}
                {booking.staffName ? (
                  <span className={`font-medium ${col.text}`}>{booking.staffName}</span>
                ) : (
                  <span className="italic text-stone-400">Unassigned</span>
                )}
                {booking.creator && (
                  <>
                    <span>·</span>
                    <span className="text-rose-500 font-medium truncate">via {booking.creator.handle}</span>
                  </>
                )}
              </div>
            </div>

            <MoreHorizontal size={16} className={`text-stone-300 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {expanded && (
          <div className="border-t border-stone-100 bg-stone-50/50 p-3 space-y-3">
            {booking.customerEmail && (
              <p className="text-stone-500 text-xs px-1">
                <span className="text-stone-400">Email:</span> {booking.customerEmail}
              </p>
            )}

            {/* Reassign — always available unless final */}
            {staff.length > 0 && !isFinal && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-stone-400 font-bold mb-1.5 px-1">
                  Assign therapist
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ReassignChip
                    label="Unassigned"
                    icon={<UserIcon size={10} />}
                    active={!booking.staffId}
                    onClick={() => reassign(null)}
                    busy={busy}
                  />
                  {eligibleStaff.map((s) => {
                    const c = colorForStaff(s.id, staff)
                    const canDoService = s.serviceIds.length === 0 || true  // we don't yet have serviceId here; show all
                    return (
                      <ReassignChip
                        key={s.id}
                        label={s.name}
                        dotClass={c.bg}
                        active={booking.staffId === s.id}
                        dim={!canDoService}
                        onClick={() => reassign(s.id)}
                        busy={busy}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Status actions */}
            {!isFinal && (
              <div className="grid grid-cols-2 gap-2">
                {booking.status === 'pending' && (
                  <>
                    <Btn onClick={() => setStatus('confirmed')} icon={<Check size={13} />} label="Confirm" busy={busy} />
                    <Btn onClick={() => setStatus('declined')} icon={<X size={13} />} label="Decline" busy={busy} variant="ghost" />
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <>
                    <Btn onClick={() => setStatus('completed')} icon={<CalendarCheck size={13} />} label="Mark complete" busy={busy} variant="success" />
                    <Btn onClick={() => setStatus('no_show')} icon={<UserX size={13} />} label="No-show" busy={busy} variant="ghost" />
                  </>
                )}
              </div>
            )}

            {!isFinal && (
              <div className="grid grid-cols-2 gap-2">
                <Btn
                  onClick={() => setReschedOpen(true)}
                  icon={<Repeat size={13} />}
                  label="Reschedule"
                  busy={busy}
                  variant="ghost"
                />
                <Btn
                  onClick={() => setStatus('cancelled')}
                  icon={<X size={13} />}
                  label="Cancel"
                  busy={busy}
                  variant="danger"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {reschedOpen && (
        <RescheduleModal
          bookingId={booking.id}
          businessSlug={businessSlug}
          serviceId={null}  // we don't carry this here; modal uses business default
          serviceName={booking.serviceName}
          currentDate={booking.date}
          currentTime={booking.time}
          onClose={() => setReschedOpen(false)}
        />
      )}
    </>
  )
}

function ReassignChip({
  label, dotClass, icon, active, dim, onClick, busy,
}: {
  label: string
  dotClass?: string
  icon?: React.ReactNode
  active: boolean
  dim?: boolean
  onClick: () => void
  busy: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
        active
          ? 'bg-stone-900 text-white border-stone-900'
          : dim
            ? 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'
            : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
      }`}
    >
      {dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      {icon}
      {label}
    </button>
  )
}

function Btn({
  onClick, icon, label, busy, variant = 'primary',
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  busy: boolean
  variant?: 'primary' | 'success' | 'ghost' | 'danger'
}) {
  const styles = {
    primary: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    ghost: 'border border-stone-200 text-stone-600 hover:bg-white',
    danger: 'border border-red-200 text-red-600 hover:bg-red-50',
  }[variant]
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 transition-all ${styles}`}
    >
      {icon} {label}
    </button>
  )
}
