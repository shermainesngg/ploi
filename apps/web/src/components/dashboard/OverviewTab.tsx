'use client'

import { TrendingUp, Wallet, Users, AlertCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { BusinessDashboardData } from '@/lib/types'
import type { AgendaBooking } from '@/lib/db'
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

      {/* Next appointment hero */}
      {next && (
        <div className="mt-4 bg-rose-600 text-white rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wide font-bold text-rose-200">Next up today</p>
          <p className="text-xl font-black mt-1 leading-tight">{next.time} · {next.customerName}</p>
          <p className="text-rose-100 text-sm mt-0.5">{next.serviceName}</p>
          {next.staffName && <p className="text-rose-200 text-xs mt-1">with {next.staffName}</p>}
        </div>
      )}

      {/* Today's compact agenda */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
            Today's agenda
          </h2>
          <Link
            href={`/dashboard/business/${businessSlug}?tab=calendar`}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Full calendar →
          </Link>
        </div>

        {todayAgenda.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-50 mb-3">
              <Sparkles size={20} className="text-stone-400" />
            </div>
            <p className="text-stone-500 text-sm">No appointments today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAgenda.slice(0, 5).map((b) => (
              <BookingActionCard key={b.id} booking={b} staff={staff} businessSlug={businessSlug} />
            ))}
            {todayAgenda.length > 5 && (
              <Link
                href={`/dashboard/business/${businessSlug}?tab=calendar`}
                className="block text-center py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
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
    <div className={`rounded-2xl border p-4 shadow-sm ${
      highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100'
    }`}>
      <div className={`flex items-center gap-2 mb-2 ${highlight ? 'text-amber-700' : 'text-stone-400'}`}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-black leading-none ${highlight ? 'text-amber-900' : 'text-stone-900'}`}>{value}</p>
      {hint && <p className={`text-xs mt-1.5 ${highlight ? 'text-amber-700' : 'text-stone-400'}`}>{hint}</p>}
    </div>
  )
}
