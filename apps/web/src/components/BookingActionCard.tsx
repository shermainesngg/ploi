'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StaffAvailabilityReason } from '@/services/staff.service'
import {
  Check, X, MoreHorizontal, CalendarCheck, UserX, Repeat, User as UserIcon,
  Calendar, Clock, AlertTriangle, Phone, Mail,
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

const REASON_LABEL: Record<StaffAvailabilityReason, string> = {
  qualified: '',
  not_qualified: 'Can’t do this service',
  day_off: 'Off this day',
  outside_hours: 'Outside hours',
  double_booked: 'Already booked',
  time_off: 'On time off',
  business_closed: 'Business closed',
}

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
    case 'completed':  return 'text-bridge-secondary bg-bridge-surface'
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
  // Per-staff availability for THIS booking's slot, keyed by staffId. Null until loaded.
  const [avail, setAvail] = useState<Record<string, StaffAvailabilityReason> | null>(null)
  // Optimistic assignment so reassign feels instant — the dashboard re-render that
  // reconciles it server-side can take a moment. undefined = trust the server prop.
  const [optimisticStaffId, setOptimisticStaffId] = useState<string | null | undefined>(undefined)
  // Once the server prop catches up, drop the override so the server is truth again.
  useEffect(() => { setOptimisticStaffId(undefined) }, [booking.staffId])

  const effectiveStaffId = optimisticStaffId !== undefined ? optimisticStaffId : booking.staffId
  const effectiveStaffName = effectiveStaffId
    ? (staff.find((s) => s.id === effectiveStaffId)?.name ?? booking.staffName)
    : null

  const col = colorForStaff(effectiveStaffId, staff)
  const isFinal = ['completed', 'cancelled', 'declined', 'no_show'].includes(booking.status)

  // A business→customer reschedule proposal exists for this booking. `proposalLive`
  // (server-computed) is the one that still holds the slot / awaits a response;
  // an expired-but-not-yet-cleared proposal is `proposalExists && !proposalLive`.
  const proposalExists = !!booking.rescheduleProposedDate
  const proposalLive = booking.rescheduleProposalLive
  // Propose needs a way to reach the customer — without an email there's no
  // accept/decline link to send, so fall back to calling them.
  const canEmailCustomer = !!booking.customerEmail

  // "Accept pending bookings within 24h" reminder (display-only). Computed client-side
  // only (mount guard) so the clock-dependent value can't cause a hydration mismatch.
  const [mountedNow, setMountedNow] = useState<number | null>(null)
  useEffect(() => { setMountedNow(Date.now()) }, [])
  const hoursLeft =
    booking.status === 'pending' && !proposalExists && booking.createdAt && mountedNow !== null
      ? 24 - (mountedNow - new Date(booking.createdAt).getTime()) / 3_600_000
      : null

  const eligibleStaff = staff

  // Load availability when the assign section is on screen. excludeBookingId keeps
  // the current assignee from flagging as double-booked against their own slot.
  useEffect(() => {
    if (!expanded || isFinal || staff.length === 0 || !booking.serviceId) return
    let cancelled = false
    const qs = new URLSearchParams({
      serviceId: booking.serviceId,
      date: booking.date,
      time: booking.time,
      excludeBookingId: booking.id,
    })
    fetch(`/api/businesses/${encodeURIComponent(businessSlug)}/staff-availability?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.availability) return
        const m: Record<string, StaffAvailabilityReason> = {}
        for (const a of d.availability) m[a.staffId] = a.reason
        setAvail(m)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [expanded, isFinal, booking.serviceId, booking.date, booking.time, booking.id, businessSlug, staff.length])

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
    if (busy) return
    const previous = optimisticStaffId
    setOptimisticStaffId(newStaffId) // instant UI; don't wait on the server re-render
    setBusy(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: newStaffId }),
      })
      if (!res.ok) throw new Error('Reassign failed')
      router.refresh() // reconcile the rest of the dashboard in the background — not awaited
    } catch {
      setOptimisticStaffId(previous) // revert on failure
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
                  <span className="text-[9px] font-bold uppercase bg-bridge-surface text-bridge-secondary px-1.5 py-0.5 rounded-full">Walk-in</span>
                )}
                {booking.isRepeat && (
                  <span className="text-[9px] font-bold uppercase bg-bridge-accent-wash text-bridge-accent px-1.5 py-0.5 rounded-full">Repeat</span>
                )}
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${statusStyles(booking.status)}`}>
                  {booking.status === 'no_show' ? 'No-show' : booking.status}
                </span>
                {booking.googleSyncStatus === 'synced' && (
                  <span title="Synced to Google Calendar" className="inline-flex items-center text-bridge-muted">
                    <CalendarCheck size={12} />
                  </span>
                )}
                {booking.googleSyncStatus === 'failed' && (
                  <span
                    title="Google Calendar sync failed — use Re-sync"
                    className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-bridge-accent"
                  >
                    <AlertTriangle size={11} /> Sync
                  </span>
                )}
                {proposalExists && proposalLive && (
                  <span
                    title="Waiting for the customer to accept the proposed time"
                    className="text-[9px] font-bold uppercase bg-bridge-accent-wash text-bridge-accent px-1.5 py-0.5 rounded-full"
                  >
                    Reschedule sent
                  </span>
                )}
                {proposalExists && !proposalLive && (
                  <span
                    title="The proposed time lapsed without a response — the slot was released"
                    className="text-[9px] font-bold uppercase bg-bridge-surface text-bridge-muted px-1.5 py-0.5 rounded-full"
                  >
                    Proposal expired
                  </span>
                )}
                {hoursLeft !== null && (
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      hoursLeft > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {hoursLeft > 0 ? `${Math.ceil(hoursLeft)}h to respond` : 'Overdue'}
                  </span>
                )}
              </div>
              {booking.isRepeat && booking.acquiredBy && (
                <p className="text-micro text-bridge-accent mt-0.5">
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
                {effectiveStaffName ? (
                  <span className={`font-medium ${col.text}`}>{effectiveStaffName}</span>
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
            {/* Customer contact details */}
            {(booking.customerPhone || booking.customerEmail) ? (
              <div className="flex flex-wrap gap-2">
                {booking.customerPhone && (
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-button bg-bridge-card border border-bridge-border text-bridge-secondary hover:border-bridge-border-strong hover:text-bridge-heading text-micro font-medium transition-colors"
                  >
                    <Phone size={12} className="text-bridge-muted" />
                    <span className="font-data tracking-tight">{booking.customerPhone}</span>
                  </a>
                )}
                {booking.customerEmail && (
                  <a
                    href={`mailto:${booking.customerEmail}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-button bg-bridge-card border border-bridge-border text-bridge-secondary hover:border-bridge-border-strong hover:text-bridge-heading text-micro font-medium transition-colors max-w-full"
                  >
                    <Mail size={12} className="text-bridge-muted flex-shrink-0" />
                    <span className="truncate">{booking.customerEmail}</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-bridge-muted/70 text-caption px-1 italic">No contact details on file</p>
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
                    active={!effectiveStaffId}
                    onClick={() => reassign(null)}
                    busy={busy}
                  />
                  {eligibleStaff.map((s) => {
                    const c = colorForStaff(s.id, staff)
                    const reason = avail?.[s.id]
                    const isActive = effectiveStaffId === s.id
                    // Grey out unavailable staff (but never the one already assigned).
                    const unavailable = !isActive && !!reason && reason !== 'qualified'
                    return (
                      <ReassignChip
                        key={s.id}
                        label={s.name}
                        dotClass={c.bg}
                        active={isActive}
                        unavailable={unavailable}
                        reasonLabel={reason ? REASON_LABEL[reason] : undefined}
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
                {booking.status === 'pending' && !canEmailCustomer ? (
                  // No email → no accept/decline link to send. Point the business at
                  // the phone chip above instead of offering a propose they can't deliver.
                  <p className="flex items-center text-micro text-bridge-muted px-1 leading-snug">
                    No email on file — call the customer to rearrange.
                  </p>
                ) : (
                  <Btn
                    onClick={() => setReschedOpen(true)}
                    icon={<Repeat size={13} />}
                    label={booking.status === 'pending' ? (proposalExists ? 'Re-propose time' : 'Propose new time') : 'Reschedule'}
                    busy={busy}
                    variant="ghost"
                  />
                )}
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
          mode={booking.status === 'pending' ? 'propose' : 'direct'}
        />
      )}
    </>
  )
}

function ReassignChip({
  label, dotClass, icon, active, unavailable, reasonLabel, onClick, busy,
}: {
  label: string
  dotClass?: string
  icon?: React.ReactNode
  active: boolean
  unavailable?: boolean
  reasonLabel?: string
  onClick: () => void
  busy: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || unavailable}
      title={unavailable ? reasonLabel : undefined}
      aria-label={unavailable && reasonLabel ? `${label} — ${reasonLabel}` : label}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-button text-micro font-semibold border transition-colors ${
        active
          ? 'bg-bridge-ink text-bridge-ink-foreground border-bridge-ink'
          : unavailable
            ? 'bg-bridge-surface border-bridge-border/60 text-bridge-muted/60 line-through cursor-not-allowed'
            : 'bg-bridge-card border-bridge-border text-bridge-secondary hover:border-bridge-border-strong disabled:opacity-50'
      }`}
    >
      {dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass} ${unavailable ? 'opacity-40' : ''}`} />}
      {icon}
      {label}
      {unavailable && reasonLabel && (
        <span className="font-normal no-underline text-bridge-muted/70">· {reasonLabel}</span>
      )}
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
