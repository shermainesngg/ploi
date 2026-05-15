'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, X, MoreHorizontal, CalendarCheck, UserX, Repeat, User as UserIcon,
  Calendar, Clock,
} from 'lucide-react'
import type { AgendaBooking } from '@/services/dashboard.service'
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
const UNASSIGNED_COLOR = { bg: 'bg-bridge-muted', soft: 'bg-bridge-surface', text: 'text-bridge-secondary' }

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
    case 'declined':   return 'text-bridge-muted bg-bridge-surface'
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

  const eligibleStaff = staff

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
      <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 shadow-card overflow-hidden">
        <button
          onClick={toggle}
          className="w-full text-left flex items-stretch gap-3 p-3 hover:bg-bridge-surface/50 transition-colors"
        >
          {/* Color rail */}
          <div className={`w-1 self-stretch rounded-full ${col.bg} flex-shrink-0`} />

          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-bridge-heading text-body leading-none">{booking.time}</p>
              <p className="text-micro text-bridge-muted mt-0.5">{booking.endTime}</p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-bridge-heading text-body truncate">{booking.customerName}</p>
                {booking.isWalkin && (
                  <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Walk-in</span>
                )}
                {booking.isRepeat && (
                  <span className="text-[9px] font-bold uppercase bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Repeat</span>
                )}
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${statusStyles(booking.status)}`}>
                  {booking.status === 'no_show' ? 'No-show' : booking.status}
                </span>
              </div>
              {booking.isRepeat && booking.acquiredBy && (
                <p className="text-micro text-purple-600 mt-0.5">
                  Returning customer · originally via {booking.acquiredBy.handle}
                </p>
              )}
              <p className="text-bridge-muted text-caption truncate mt-0.5">{booking.serviceName}</p>
              <div className="flex items-center gap-2 text-micro text-bridge-muted mt-1 flex-wrap">
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
                  <span className="italic text-bridge-muted">Unassigned</span>
                )}
                {booking.creator && (
                  <>
                    <span>·</span>
                    <span className="text-bridge-accent font-medium truncate">via {booking.creator.handle}</span>
                  </>
                )}
              </div>
            </div>

            <MoreHorizontal size={16} className={`text-bridge-border-strong flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {expanded && (
          <div className="border-t border-bridge-border/40 bg-bridge-surface/50 p-3 space-y-3">
            {booking.customerEmail && (
              <p className="text-bridge-muted text-caption px-1">
                <span className="text-bridge-muted/70">Email:</span> {booking.customerEmail}
              </p>
            )}

            {staff.length > 0 && !isFinal && (
              <div>
                <p className="text-micro uppercase tracking-wide text-bridge-muted font-bold mb-1.5 px-1">
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
                    const canDoService = s.serviceIds.length === 0 || true
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
          serviceId={null}
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
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-button text-micro font-semibold border transition-colors disabled:opacity-50 ${
        active
          ? 'bg-bridge-heading text-white border-bridge-heading'
          : dim
            ? 'bg-bridge-card border-bridge-border text-bridge-muted hover:border-bridge-border-strong'
            : 'bg-bridge-card border-bridge-border text-bridge-secondary hover:border-bridge-border-strong'
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
    primary: 'bg-bridge-accent text-white hover:bg-bridge-accent-dark',
    success: 'bg-green-600 text-white hover:bg-green-700',
    ghost: 'border border-bridge-border text-bridge-secondary hover:bg-bridge-card',
    danger: 'border border-red-200 text-red-600 hover:bg-red-50',
  }[variant]
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`py-2 rounded-button text-caption font-semibold flex items-center justify-center gap-1 disabled:opacity-50 transition-all ${styles}`}
    >
      {icon} {label}
    </button>
  )
}
