'use client'

import { TrendingUp, Wallet, Users, AlertCircle, Sparkles, Repeat } from 'lucide-react'
import Link from 'next/link'
import type { BusinessDashboardData } from '@/lib/types'
import type { AgendaBooking } from '@/services/dashboard.service'
import BookingActionCard, { type StaffSummary } from '../BookingActionCard'

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }

interface Props {
  data: BusinessDashboardData
  todayAgenda: AgendaBooking[]
  pendingRequestsCount: number
  staff: StaffSummary[]
  businessSlug: string
}

export default function OverviewTab({
  data, todayAgenda, pendingRequestsCount, staff, businessSlug,
}: Props) {
  const todayActive = todayAgenda.filter((b) => b.status !== 'cancelled' && b.status !== 'declined')
  const todayRevenue = todayActive.reduce((s, b) => s + b.price, 0)
  const pendingBookings = todayAgenda.filter((b) => b.status === 'pending').length
  const pendingActions = pendingBookings + pendingRequestsCount

  const next = todayActive.find((b) => b.status === 'confirmed' || b.status === 'pending')

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Today's bookings" value={String(todayActive.length)} icon={<TrendingUp size={14} />} />
        <Kpi label="Today's revenue" value={formatPrice(todayRevenue)} icon={<Wallet size={14} />} />
        <Kpi
          label="Pending actions"
          value={String(pendingActions)}
          icon={<AlertCircle size={14} />}
          highlight={pendingActions > 0}
          hint={pendingActions > 0 ? 'Tap "Bookings" or "Creators"' : undefined}
        />
        <Kpi
          label="Total bookings"
          value={String(data.stats.totalBookings)}
          icon={<Users size={14} />}
          hint={`${formatPrice(data.stats.totalRevenue)} all time`}
        />
      </div>

      {/* Returning customer insight */}
      {(() => {
        const total = data.bookings.filter((b) => b.status !== 'cancelled').length
        const repeats = data.bookings.filter((b) => b.isRepeat && b.status !== 'cancelled').length
        if (total === 0) return null
        const pct = Math.round((repeats / total) * 100)
        return (
          <div className="mt-3 bg-purple-50 border border-purple-200 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0">
              <Repeat size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-purple-900 text-sm">
                {repeats} returning customer{repeats !== 1 ? 's' : ''}
              </p>
              <p className="text-purple-700 text-xs leading-relaxed">
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
            href={`/dashboard/business/${businessSlug}?tab=calendar`}
            className="text-caption font-semibold text-bridge-accent hover:underline"
          >
            Full calendar →
          </Link>
        </div>

        {todayAgenda.length === 0 ? (
          <div className="bg-white rounded-2xl border border-bridge-border/60 p-8 text-center">
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
                href={`/dashboard/business/${businessSlug}?tab=calendar`}
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
  label, value, icon, hint, highlight,
}: {
  label: string; value: string; icon: React.ReactNode; hint?: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-card ${
      highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-bridge-border/60'
    }`}>
      <div className={`flex items-center gap-2 mb-2 ${highlight ? 'text-amber-700' : 'text-bridge-muted'}`}>
        {icon}
        <span className="text-micro uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold leading-none ${highlight ? 'text-amber-900' : 'text-bridge-heading'}`}>{value}</p>
      {hint && <p className={`text-caption mt-1.5 ${highlight ? 'text-amber-700' : 'text-bridge-muted'}`}>{hint}</p>}
    </div>
  )
}
