'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { AgendaBooking } from '@/services/dashboard.service'

interface Props {
  bookings: AgendaBooking[]
  weekStart: string  // YYYY-MM-DD (Monday)
  businessSlug: string
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function WeeklyAgenda({ bookings, weekStart, businessSlug }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const days: { date: string; bookings: AgendaBooking[]; revenue: number }[] = []
  for (let i = 0; i < 7; i++) {
    const date = shiftDate(weekStart, i)
    const dayBookings = bookings.filter(
      (b) => b.date === date && b.status !== 'cancelled' && b.status !== 'declined',
    )
    const revenue = dayBookings.reduce((s, b) => s + b.price, 0)
    days.push({ date, bookings: dayBookings, revenue })
  }

  const weekEnd = shiftDate(weekStart, 6)
  const ws = new Date(`${weekStart}T00:00:00`)
  const we = new Date(`${weekEnd}T00:00:00`)
  const totalBookings = days.reduce((s, d) => s + d.bookings.length, 0)
  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0)
  const maxBookings = Math.max(1, ...days.map((d) => d.bookings.length))

  function nav(toStart: string) {
    router.push(`/dashboard/business/${businessSlug}?view=week&date=${toStart}`)
  }
  function goToDay(date: string) {
    router.push(`/dashboard/business/${businessSlug}?view=day&date=${date}`)
  }

  return (
    <>
      {/* Week navigator */}
      <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 shadow-sm overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-3">
          <button
            onClick={() => nav(shiftDate(weekStart, -7))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-bold text-bridge-heading text-body">
              {ws.getDate()} {MONTH_NAMES[ws.getMonth()]} – {we.getDate()} {MONTH_NAMES[we.getMonth()]}
            </p>
            <p className="text-bridge-muted text-[11px] mt-0.5">
              {totalBookings} appointments · ฿{totalRevenue.toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => nav(shiftDate(weekStart, 7))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day rows with density bars */}
      <div className="space-y-1.5">
        {days.map(({ date, bookings: db, revenue }) => {
          const d = new Date(`${date}T00:00:00`)
          const isToday = date === today
          const density = db.length / maxBookings

          return (
            <button
              key={date}
              onClick={() => goToDay(date)}
              className={`w-full text-left bg-bridge-card rounded-xl border ${isToday ? 'border-bridge-accent-light' : 'border-bridge-border/60'} shadow-sm p-3 hover:shadow-md transition-shadow flex items-center gap-3`}
            >
              <div className="flex-shrink-0 w-12 text-center">
                <p className={`text-micro uppercase tracking-wide font-semibold ${isToday ? 'text-bridge-accent' : 'text-bridge-muted'}`}>
                  {DAY_NAMES[d.getDay()]}
                </p>
                <p className={`text-lg font-bold leading-none mt-0.5 ${isToday ? 'text-bridge-accent' : 'text-bridge-heading'}`}>
                  {d.getDate()}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-body font-semibold text-bridge-heading">
                    {db.length} appointment{db.length !== 1 ? 's' : ''}
                  </p>
                  {isToday && (
                    <span className="text-micro uppercase tracking-wide font-bold bg-bridge-accent-soft text-bridge-accent px-1.5 py-0.5 rounded-full">Today</span>
                  )}
                </div>
                {/* Density bar */}
                <div className="w-full h-1.5 bg-bridge-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isToday ? 'bg-bridge-accent' : 'bg-bridge-border-strong'} rounded-full`}
                    style={{ width: `${Math.max(density * 100, db.length > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <p className="text-[11px] text-bridge-muted mt-1">
                  {revenue > 0 ? `฿${revenue.toLocaleString()}` : '—'}
                </p>
              </div>

              <Calendar size={14} className="text-bridge-border-strong flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </>
  )
}
