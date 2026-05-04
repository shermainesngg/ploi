'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AgendaBooking } from '@/lib/db'

interface Props {
  bookings: AgendaBooking[]
  monthStart: string  // YYYY-MM-01
  businessSlug: string
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function pad(n: number) { return String(n).padStart(2, '0') }

function shiftMonth(monthStart: string, delta: number): string {
  const [y, m] = monthStart.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}

export default function MonthlyAgenda({ bookings, monthStart, businessSlug }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const start = new Date(`${monthStart}T00:00:00`)
  const year = start.getFullYear()
  const month = start.getMonth()
  const firstDow = start.getDay()  // 0 = Sun
  const lastDay = new Date(year, month + 1, 0).getDate()

  // Group bookings by date
  const byDate = new Map<string, AgendaBooking[]>()
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'declined') continue
    const cur = byDate.get(b.date) ?? []
    cur.push(b)
    byDate.set(b.date, cur)
  }

  // Stats
  const activeBookings = Array.from(byDate.values()).flat()
  const totalRevenue = activeBookings.reduce((s, b) => s + b.price, 0)

  let busiestDay: string | null = null
  let busiestCount = 0
  for (const [date, list] of byDate) {
    if (list.length > busiestCount) {
      busiestCount = list.length
      busiestDay = date
    }
  }

  // Build cell grid
  type Cell = { date: string | null; count: number; isToday: boolean; revenue: number }
  const cells: Cell[] = []
  // Leading blanks
  for (let i = 0; i < firstDow; i++) cells.push({ date: null, count: 0, isToday: false, revenue: 0 })
  for (let day = 1; day <= lastDay; day++) {
    const date = `${year}-${pad(month + 1)}-${pad(day)}`
    const dayBookings = byDate.get(date) ?? []
    const revenue = dayBookings.reduce((s, b) => s + b.price, 0)
    cells.push({
      date,
      count: dayBookings.length,
      isToday: date === today,
      revenue,
    })
  }
  // Trailing blanks to complete the last week
  while (cells.length % 7 !== 0) cells.push({ date: null, count: 0, isToday: false, revenue: 0 })

  function nav(toMonthStart: string) {
    router.push(`/dashboard/business/${businessSlug}?view=month&date=${toMonthStart}`)
  }
  function goToDay(date: string) {
    router.push(`/dashboard/business/${businessSlug}?view=day&date=${date}`)
  }

  function densityClass(count: number) {
    if (count === 0) return ''
    if (count === 1) return 'after:bg-rose-300'
    if (count <= 3) return 'after:bg-rose-500'
    return 'after:bg-rose-600'
  }

  return (
    <>
      {/* Month navigator */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-3">
          <button
            onClick={() => nav(shiftMonth(monthStart, -1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-50 text-stone-500"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-bold text-stone-900 text-sm">{MONTH_NAMES[month]} {year}</p>
            <p className="text-stone-400 text-[11px] mt-0.5">
              {activeBookings.length} bookings · ฿{totalRevenue.toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => nav(shiftMonth(monthStart, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-50 text-stone-500"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3 mb-3">
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-stone-400 uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell.date) {
              return <div key={idx} className="aspect-square" />
            }
            const day = parseInt(cell.date.slice(-2), 10)
            return (
              <button
                key={idx}
                onClick={() => goToDay(cell.date!)}
                className={`aspect-square relative rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors hover:bg-stone-100 ${
                  cell.isToday ? 'bg-rose-50 text-rose-700 font-bold' : 'text-stone-700'
                } ${
                  // Bottom dot via after-pseudo. Tailwind doesn't do dynamic pseudo bg via interpolation,
                  // so we keep a known set of classes:
                  cell.count > 0
                    ? `after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:rounded-full after:w-1.5 after:h-1.5 ${densityClass(cell.count)}`
                    : ''
                }`}
              >
                <span>{day}</span>
                {cell.count > 1 && (
                  <span className="text-[9px] text-stone-400 mt-0.5">{cell.count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      {activeBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-2 text-sm">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Summary</p>
          <div className="flex justify-between"><span className="text-stone-500">Total bookings</span><span className="font-semibold text-stone-900">{activeBookings.length}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Total revenue</span><span className="font-semibold text-stone-900">฿{totalRevenue.toLocaleString()}</span></div>
          {busiestDay && (
            <div className="flex justify-between">
              <span className="text-stone-500">Busiest day</span>
              <button onClick={() => goToDay(busiestDay!)} className="font-semibold text-rose-600 hover:underline">
                {new Date(`${busiestDay}T00:00:00`).getDate()} {MONTH_NAMES[month]} ({busiestCount})
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
