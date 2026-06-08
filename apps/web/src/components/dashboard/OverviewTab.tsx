'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Wallet, Users, AlertCircle, Sparkles, Repeat, CalendarClock, X, Inbox } from 'lucide-react'
import Link from 'next/link'
import type { BusinessDashboardData } from '@/lib/types'
import type { AgendaBooking } from '@/services/dashboard.service'
import BookingActionCard, { type StaffSummary } from '../BookingActionCard'

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }

interface Props {
  data: BusinessDashboardData
  todayAgenda: AgendaBooking[]
  pendingBookingCount: number
  creatorActionCount: number
  staff: StaffSummary[]
  businessSlug: string
}

export default function OverviewTab({
  data, todayAgenda, pendingBookingCount, creatorActionCount, staff, businessSlug,
}: Props) {
  const todayActive = todayAgenda.filter((b) => b.status !== 'cancelled' && b.status !== 'declined')
  const todayRevenue = todayActive.reduce((s, b) => s + b.price, 0)

  const next = todayActive.find((b) => b.status === 'confirmed' || b.status === 'pending')

  // One-time staff intro: shown while the business has no staff, dismissible.
  const staffIntroKey = `ploi_staff_intro_dismissed_${businessSlug}`
  const [staffIntroDismissed, setStaffIntroDismissed] = useState(true)
  useEffect(() => {
    setStaffIntroDismissed(localStorage.getItem(staffIntroKey) === '1')
  }, [staffIntroKey])
  function dismissStaffIntro() {
    localStorage.setItem(staffIntroKey, '1')
    setStaffIntroDismissed(true)
  }

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Today's bookings" value={String(todayActive.length)} icon={<TrendingUp size={14} />} />
        <Kpi label="Today's revenue" value={formatPrice(todayRevenue)} icon={<Wallet size={14} />} />
        <Kpi
          label="Pending bookings"
          value={String(pendingBookingCount)}
          icon={<AlertCircle size={14} />}
          highlight={pendingBookingCount > 0}
          hint={pendingBookingCount > 0 ? 'Tap to review →' : 'All clear'}
          href="?tab=bookings"
        />
        <Kpi
          label="Creator requests"
          value={String(creatorActionCount)}
          icon={<Users size={14} />}
          highlight={creatorActionCount > 0}
          hint={creatorActionCount > 0 ? 'Tap to review →' : 'All clear'}
          href="?tab=creators"
        />
        <Kpi
          label="Total bookings"
          value={String(data.stats.totalBookings)}
          icon={<Inbox size={14} />}
          hint={`${formatPrice(data.stats.totalRevenue)} all time`}
          className="col-span-2"
        />
      </div>

      {/* Staff intro — surfaces the scheduling suite until staff exist */}
      {staff.length === 0 && !staffIntroDismissed && (
        <div className="mt-3 bg-bridge-card border border-bridge-border/60 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-bridge-surface flex items-center justify-center text-bridge-heading flex-shrink-0">
              <CalendarClock size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-bridge-heading text-sm">Add your staff</p>
              <p className="text-bridge-secondary text-xs leading-relaxed mt-0.5">
                Give each person their services and hours — customers book the right
                person, and everyone gets their own shareable schedule.
              </p>
              <Link
                href={`/dashboard/business/${businessSlug}/staff`}
                className="inline-block mt-2 text-xs font-semibold text-bridge-heading underline underline-offset-2 hover:text-bridge-secondary"
              >
                Set up staff →
              </Link>
            </div>
            <button
              onClick={dismissStaffIntro}
              aria-label="Dismiss"
              className="text-bridge-muted hover:text-bridge-secondary flex-shrink-0 p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Returning customer insight */}
      {(() => {
        const total = data.bookings.filter((b) => b.status !== 'cancelled').length
        const repeats = data.bookings.filter((b) => b.isRepeat && b.status !== 'cancelled').length
        if (total === 0) return null
        const pct = Math.round((repeats / total) * 100)
        return (
          <div className="mt-3 bg-bridge-surface border border-bridge-border/60 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-bridge-accent-wash flex items-center justify-center text-bridge-accent flex-shrink-0">
              <Repeat size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-bridge-heading text-sm">
                {repeats} returning customer{repeats !== 1 ? 's' : ''}
              </p>
              <p className="text-bridge-secondary text-xs leading-relaxed">
                {pct}% of bookings are repeats — these came from creator-acquired customers coming back.
              </p>
            </div>
          </div>
        )
      })()}

      {/* Next appointment hero */}
      {next && (
        <div className="mt-4 bg-bridge-accent text-white rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide font-bold text-bridge-accent-soft">Next up today</p>
          <p className="text-xl font-bold mt-1 leading-tight">{next.time} · {next.customerName}</p>
          <p className="text-bridge-accent-soft text-sm mt-0.5">{next.serviceName}</p>
          {next.staffName && <p className="text-white/70 text-xs mt-1">with {next.staffName}</p>}
        </div>
      )}

      {/* Today's compact agenda */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-label text-bridge-muted uppercase tracking-widest">
            Today&apos;s agenda
          </h2>
          <Link
            href="?tab=calendar"
            className="text-caption font-semibold text-bridge-accent hover:underline"
          >
            Full calendar →
          </Link>
        </div>

        {todayAgenda.length === 0 ? (
          <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bridge-surface mb-3">
              <Sparkles size={20} className="text-bridge-muted" />
            </div>
            <p className="text-bridge-muted text-body">No appointments today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAgenda.slice(0, 5).map((b) => (
              <BookingActionCard key={b.id} booking={b} staff={staff} businessSlug={businessSlug} />
            ))}
            {todayAgenda.length > 5 && (
              <Link
                href="?tab=calendar"
                className="block text-center py-2 text-caption font-semibold text-bridge-accent hover:bg-bridge-accent-wash rounded-xl transition-colors"
              >
                See {todayAgenda.length - 5} more →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({
  label, value, icon, hint, highlight, href, className,
}: {
  label: string; value: string; icon: React.ReactNode; hint?: string; highlight?: boolean
  href?: string; className?: string
}) {
  const body = (
    <>
      <div className={`flex items-center gap-2 mb-2 ${highlight ? 'text-bridge-accent' : 'text-bridge-muted'}`}>
        {icon}
        <span className="text-micro uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-data text-2xl font-bold leading-none tracking-tight ${highlight ? 'text-bridge-accent' : 'text-bridge-heading'}`}>{value}</p>
      {hint && <p className={`text-caption mt-1.5 ${highlight ? 'text-bridge-secondary' : 'text-bridge-muted'}`}>{hint}</p>}
    </>
  )
  const cardClass = `rounded-2xl border p-4 shadow-card ${
    highlight ? 'bg-bridge-accent-wash border-bridge-accent-light' : 'bg-bridge-card border-bridge-border/60'
  } ${className ?? ''}`
  if (href) {
    return (
      <Link href={href} scroll={false} className={`${cardClass} block transition-colors ${
        highlight ? 'hover:border-bridge-accent' : 'hover:border-bridge-border-strong'
      }`}>
        {body}
      </Link>
    )
  }
  return <div className={cardClass}>{body}</div>
}
