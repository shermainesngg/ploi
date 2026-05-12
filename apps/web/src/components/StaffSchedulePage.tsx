'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Clock, AlertCircle, Sparkles,
} from 'lucide-react'
import type { StaffMember, StaffScheduleEntry, StaffBlock } from '@/services/staff.service'

type ScheduleView = 'week' | 'month' | 'day'

interface BookingItem {
  id: string
  customerName: string
  serviceName: string
  serviceDuration: number
  price: number
  date: string
  time: string
  endTime: string
  status: string
  isWalkin: boolean
}

interface Props {
  staff: StaffMember
  businessName: string | null
  view: ScheduleView
  baseDate: string
  rangeStart: string
  rangeEnd: string
  bookings: BookingItem[]
  schedule: StaffScheduleEntry[]
  blocks: StaffBlock[]
  weekCount: number
  nextAppointment: { date: string; time: string; serviceName: string; customerName: string } | null
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(n: number) { return String(n).padStart(2, '0') }
function formatDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function shiftDate(s: string, days: number) {
  const d = new Date(`${s}T00:00:00`)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}
function shiftMonth(s: string, delta: number) {
  const d = new Date(`${s}T00:00:00`)
  return formatDate(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

export default function StaffSchedulePage({
  staff, businessName, view, baseDate, bookings, schedule, blocks,
  weekCount, nextAppointment,
}: Props) {
  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto pb-16">

        {/* Header */}
        <Header staff={staff} businessName={businessName} />

        {/* Pro upsell */}
        <div className="mx-4 mt-3 bg-bridge-surface border border-bridge-border rounded-2xl p-3 text-center">
          <p className="text-bridge-muted text-xs">
            <span className="font-semibold text-bridge-text">Want separate staff logins?</span>{' '}
            Coming soon in <span className="font-bold text-bridge-accent">BRIDGE Pro</span>.
          </p>
        </div>

        {/* Stats */}
        <Stats weekCount={weekCount} nextAppointment={nextAppointment} />

        {/* View switcher */}
        <div className="px-4 mt-4">
          <div className="flex items-center gap-1 bg-bridge-surface p-1 rounded-xl">
            {(['week', 'month', 'day'] as ScheduleView[]).map((v) => (
              <Link
                key={v}
                href={`/staff/${staff.id}/schedule?view=${v}&date=${baseDate}`}
                scroll={false}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  view === v ? 'bg-white text-bridge-heading shadow-sm' : 'text-bridge-muted hover:text-bridge-text'
                }`}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 mt-4">
          {view === 'week' && (
            <WeekView
              staffId={staff.id}
              baseDate={baseDate}
              bookings={bookings}
              schedule={schedule}
              blocks={blocks}
            />
          )}
          {view === 'month' && (
            <MonthView
              staffId={staff.id}
              baseDate={baseDate}
              bookings={bookings}
            />
          )}
          {view === 'day' && (
            <DayView
              staffId={staff.id}
              baseDate={baseDate}
              bookings={bookings}
              schedule={schedule}
              blocks={blocks}
            />
          )}
        </div>

        <p className="mt-8 text-center text-xs text-bridge-muted px-6">
          This is your personal schedule link. Bookmark it.
        </p>
      </div>
    </div>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────

function Header({ staff, businessName }: { staff: StaffMember; businessName: string | null }) {
  return (
    <div className="px-5 pt-8 pb-6 bg-white border-b border-bridge-border/60">
      <span className="text-xs font-bold tracking-tight text-bridge-accent bg-bridge-accent-wash px-2.5 py-1 rounded-full">BRIDGE</span>
      <div className="flex items-start gap-3 mt-4">
        <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-bridge-surface flex items-center justify-center">
          {staff.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-bridge-muted">{staff.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-bridge-heading leading-tight">{staff.name}</h1>
          {staff.role && <p className="text-bridge-muted text-sm">{staff.role}</p>}
          {businessName && <p className="text-bridge-muted text-xs mt-0.5">{businessName}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Stats ────────────────────────────────────────────────────────────────────

function Stats({
  weekCount, nextAppointment,
}: {
  weekCount: number
  nextAppointment: Props['nextAppointment']
}) {
  return (
    <div className="px-4 mt-4 grid grid-cols-2 gap-3">
      <div className="bg-white rounded-2xl border border-bridge-border/60 p-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-wide font-bold text-bridge-muted">This week</p>
        <p className="text-2xl font-bold text-bridge-heading leading-none mt-1">{weekCount}</p>
        <p className="text-bridge-muted text-[11px] mt-1">appointment{weekCount !== 1 ? 's' : ''}</p>
      </div>
      <div className="bg-white rounded-2xl border border-bridge-border/60 p-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-wide font-bold text-bridge-muted">Next up</p>
        {nextAppointment ? (
          <>
            <p className="text-sm font-bold text-bridge-heading leading-tight mt-1 truncate">
              {nextAppointment.date === new Date().toISOString().split('T')[0] ? 'Today' : (() => {
                const d = new Date(`${nextAppointment.date}T00:00:00`)
                return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
              })()} {nextAppointment.time}
            </p>
            <p className="text-bridge-muted text-[11px] truncate">{nextAppointment.serviceName}</p>
          </>
        ) : (
          <p className="text-bridge-muted text-sm mt-1">Nothing scheduled</p>
        )}
      </div>
    </div>
  )
}

// ── Week view (default) ─────────────────────────────────────────────────────

function startOfWeek(s: string) {
  const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() - d.getDay())
  return formatDate(d)
}

function WeekView({
  staffId, baseDate, bookings, schedule, blocks,
}: {
  staffId: string
  baseDate: string
  bookings: BookingItem[]
  schedule: StaffScheduleEntry[]
  blocks: StaffBlock[]
}) {
  const router = useRouter()
  const today = formatDate(new Date())
  const weekStart = startOfWeek(baseDate)

  const days: { date: string; bookings: BookingItem[]; isOff: boolean; onLeave: boolean; hours: string | null }[] = []
  for (let i = 0; i < 7; i++) {
    const date = shiftDate(weekStart, i)
    const dow = new Date(`${date}T00:00:00`).getDay()
    const sched = schedule.find((s) => s.dayOfWeek === dow)
    const isOff = sched ? !sched.isAvailable : false
    const onLeave = blocks.some((b) => b.blockDate === date)
    const dayBookings = bookings.filter((b) => b.date === date)
    const hours = sched && sched.isAvailable ? `${sched.startTime}–${sched.endTime}` : null
    days.push({ date, bookings: dayBookings, isOff, onLeave, hours })
  }

  const ws = new Date(`${weekStart}T00:00:00`)
  const we = new Date(`${shiftDate(weekStart, 6)}T00:00:00`)

  const [selectedDate, setSelectedDate] = useState<string>(
    days.find((d) => d.date === today) ? today : days[0]?.date,
  )
  const selectedDay = days.find((d) => d.date === selectedDate) ?? days[0]

  function navWeek(delta: number) {
    router.push(`/staff/${staffId}/schedule?view=week&date=${shiftDate(weekStart, delta * 7)}`)
  }

  return (
    <>
      {/* Week strip */}
      <div className="bg-white rounded-2xl border border-bridge-border/60 shadow-sm overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-bridge-border/60">
          <button
            onClick={() => navWeek(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="font-bold text-bridge-heading text-sm">
            {ws.getDate()} {MONTH_SHORT[ws.getMonth()]} – {we.getDate()} {MONTH_SHORT[we.getMonth()]}
          </p>
          <button
            onClick={() => navWeek(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 7 day cells */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const d = new Date(`${day.date}T00:00:00`)
            const isToday = day.date === today
            const isSelected = day.date === selectedDate
            const count = day.bookings.length
            const inactive = day.isOff || day.onLeave

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`flex flex-col items-center justify-center py-2.5 transition-colors ${
                  isSelected ? 'bg-bridge-accent-wash' : 'hover:bg-bridge-surface'
                } ${isToday && !isSelected ? 'bg-bridge-surface/50' : ''}`}
              >
                <span className={`text-[10px] uppercase tracking-wide font-semibold ${
                  isSelected ? 'text-bridge-accent' : isToday ? 'text-bridge-text' : 'text-bridge-muted'
                }`}>
                  {DAY_LETTERS[d.getDay()]}
                </span>
                <span className={`text-base font-bold mt-0.5 ${
                  isSelected ? 'text-bridge-accent' : isToday ? 'text-bridge-heading' : 'text-bridge-text'
                }`}>
                  {d.getDate()}
                </span>
                <div className="h-1.5 mt-0.5 flex items-center">
                  {count > 0 ? (
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-bridge-accent' : 'text-bridge-muted'}`}>
                      {count}
                    </span>
                  ) : inactive ? (
                    <span className="w-1 h-1 rounded-full bg-bridge-border-strong" />
                  ) : (
                    <span className="w-1 h-1" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <DayDetail
          date={selectedDay.date}
          bookings={selectedDay.bookings}
          isOff={selectedDay.isOff}
          onLeave={selectedDay.onLeave}
          leaveReason={blocks.find((b) => b.blockDate === selectedDay.date)?.reason ?? null}
          hours={selectedDay.hours}
        />
      )}
    </>
  )
}

// ── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  staffId, baseDate, bookings,
}: {
  staffId: string
  baseDate: string
  bookings: BookingItem[]
}) {
  const router = useRouter()
  const today = formatDate(new Date())
  const start = new Date(`${baseDate}T00:00:00`)
  const year = start.getFullYear()
  const month = start.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const lastDay = new Date(year, month + 1, 0).getDate()

  const byDate = new Map<string, number>()
  for (const b of bookings) {
    byDate.set(b.date, (byDate.get(b.date) ?? 0) + 1)
  }

  type Cell = { date: string | null; count: number }
  const cells: Cell[] = []
  for (let i = 0; i < firstDow; i++) cells.push({ date: null, count: 0 })
  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${pad(month + 1)}-${pad(d)}`
    cells.push({ date, count: byDate.get(date) ?? 0 })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, count: 0 })

  function navMonth(delta: number) {
    router.push(`/staff/${staffId}/schedule?view=month&date=${shiftMonth(baseDate, delta)}`)
  }
  function goToDay(date: string) {
    router.push(`/staff/${staffId}/schedule?view=day&date=${date}`)
  }

  function densityClass(count: number) {
    if (count === 0) return ''
    if (count === 1) return 'after:bg-bridge-accent-light'
    if (count <= 3) return 'after:bg-bridge-accent'
    return 'after:bg-bridge-accent'
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-bridge-border/60 shadow-sm overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            onClick={() => navMonth(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="font-bold text-bridge-heading text-sm">{MONTH_NAMES[month]} {year}</p>
          <button
            onClick={() => navMonth(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-bridge-border/60 shadow-sm p-3">
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DAY_LETTERS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-bridge-muted uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell.date) return <div key={idx} className="aspect-square" />
            const day = parseInt(cell.date.slice(-2), 10)
            const isToday = cell.date === today
            return (
              <button
                key={idx}
                onClick={() => goToDay(cell.date!)}
                className={`aspect-square relative rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors hover:bg-bridge-surface ${
                  isToday ? 'bg-bridge-accent-wash text-bridge-accent font-bold' : 'text-bridge-text'
                } ${
                  cell.count > 0
                    ? `after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:rounded-full after:w-1.5 after:h-1.5 ${densityClass(cell.count)}`
                    : ''
                }`}
              >
                <span>{day}</span>
                {cell.count > 1 && (
                  <span className="text-[9px] text-bridge-muted mt-0.5">{cell.count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  staffId, baseDate, bookings, schedule, blocks,
}: {
  staffId: string
  baseDate: string
  bookings: BookingItem[]
  schedule: StaffScheduleEntry[]
  blocks: StaffBlock[]
}) {
  const router = useRouter()
  const dow = new Date(`${baseDate}T00:00:00`).getDay()
  const sched = schedule.find((s) => s.dayOfWeek === dow)
  const isOff = sched ? !sched.isAvailable : false
  const onLeave = blocks.some((b) => b.blockDate === baseDate)
  const hours = sched && sched.isAvailable ? `${sched.startTime}–${sched.endTime}` : null
  const leaveReason = blocks.find((b) => b.blockDate === baseDate)?.reason ?? null

  function nav(delta: number) {
    router.push(`/staff/${staffId}/schedule?view=day&date=${shiftDate(baseDate, delta)}`)
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-bridge-border/60 shadow-sm overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            onClick={() => nav(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="font-bold text-bridge-heading text-sm">
              {(() => {
                const d = new Date(`${baseDate}T00:00:00`)
                return `${DAY_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
              })()}
            </p>
          </div>
          <button
            onClick={() => nav(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <DayDetail
        date={baseDate}
        bookings={bookings}
        isOff={isOff}
        onLeave={onLeave}
        leaveReason={leaveReason}
        hours={hours}
      />
    </>
  )
}

// ── Shared day detail ───────────────────────────────────────────────────────

function DayDetail({
  date, bookings, isOff, onLeave, leaveReason, hours,
}: {
  date: string
  bookings: BookingItem[]
  isOff: boolean
  onLeave: boolean
  leaveReason: string | null
  hours: string | null
}) {
  const today = formatDate(new Date())
  const d = new Date(`${date}T00:00:00`)
  const isToday = date === today

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="text-sm font-bold text-bridge-heading">
            {isToday ? 'Today' : DAY_FULL[d.getDay()]}{' '}
            <span className="text-bridge-muted font-normal">·</span>{' '}
            <span className="text-bridge-muted font-normal">{d.getDate()} {MONTH_SHORT[d.getMonth()]}</span>
          </p>
          {hours && <p className="text-bridge-muted text-xs mt-0.5"><Clock size={10} className="inline-block mr-1" />Shift {hours}</p>}
        </div>
        <span className="text-xs text-bridge-muted">
          {bookings.length} appointment{bookings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {(isOff || onLeave) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2 mb-3">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              {onLeave ? 'On leave' : 'Day off'}
            </p>
            {leaveReason && <p className="text-amber-700 text-xs mt-0.5">{leaveReason}</p>}
          </div>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-bridge-border/60 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bridge-bg mb-3">
            <Sparkles size={20} className="text-bridge-muted" />
          </div>
          <p className="text-bridge-muted text-sm">No appointments.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-bridge-border/60 shadow-sm p-3">
              <div className="flex items-start gap-3">
                <div className="text-right flex-shrink-0 w-14">
                  <p className="font-bold text-bridge-heading text-sm leading-none">{b.time}</p>
                  <p className="text-[10px] text-bridge-muted mt-0.5">{b.endTime}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-bridge-heading text-sm truncate">{b.customerName}</p>
                    {b.isWalkin && (
                      <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Walk-in</span>
                    )}
                  </div>
                  <p className="text-bridge-muted text-xs truncate mt-0.5">{b.serviceName}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                    <span className="flex items-center gap-1 text-bridge-muted">
                      <Clock size={10} />
                      {b.serviceDuration} min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
