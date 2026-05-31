'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft, ChevronRight, Users, Sparkles } from 'lucide-react'
import type { AgendaBooking } from '@/services/dashboard.service'
import BookingActionCard, { colorForStaff, type StaffSummary } from './BookingActionCard'

interface Props {
  agenda: AgendaBooking[]
  date: string
  businessSlug: string
  staff: StaffSummary[]
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }
function shiftDate(s: string, days: number) {
  const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
function prettyDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = shiftDate(today, 1)
  const yesterday = shiftDate(today, -1)
  let label: string
  if (dateStr === today) label = 'Today'
  else if (dateStr === tomorrow) label = 'Tomorrow'
  else if (dateStr === yesterday) label = 'Yesterday'
  else label = DAY_NAMES[d.getDay()]
  return `${label} · ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

export default function DailyAgenda({ agenda, date, businessSlug, staff }: Props) {
  const router = useRouter()
  const [filterStaff, setFilterStaff] = useState<string | 'all' | 'unassigned'>('all')

  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  function go(toDate: string) {
    router.push(`/dashboard/business/${businessSlug}?tab=calendar&view=day&date=${toDate}`)
  }

  const filtered = agenda.filter((b) => {
    if (filterStaff === 'all') return true
    if (filterStaff === 'unassigned') return !b.staffId
    return b.staffId === filterStaff
  })
  const active = filtered.filter((b) => b.status !== 'cancelled' && b.status !== 'declined')
  const revenue = active.reduce((s, b) => s + b.price, 0)

  return (
    <>
      {!isToday && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => go(today)}
            className="text-caption font-semibold text-bridge-accent hover:bg-bridge-accent-wash px-2 py-1 rounded-md flex items-center gap-1"
          >
            <Calendar size={11} /> Today
          </button>
        </div>
      )}

      <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 shadow-sm overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-3">
          <button
            onClick={() => go(shiftDate(date, -1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-bold text-bridge-heading text-body">{prettyDate(date)}</p>
            <p className="text-bridge-muted text-[11px] mt-0.5">
              {active.length} appointment{active.length !== 1 ? 's' : ''} · {formatPrice(revenue)}
            </p>
          </div>
          <button
            onClick={() => go(shiftDate(date, 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bridge-surface text-bridge-muted"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {staff.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterChip label="All" active={filterStaff === 'all'} onClick={() => setFilterStaff('all')} icon={<Users size={11} />} />
          {staff.map((s) => {
            const c = colorForStaff(s.id, staff)
            return (
              <FilterChip
                key={s.id}
                label={s.name}
                active={filterStaff === s.id}
                onClick={() => setFilterStaff(s.id)}
                dotClass={c.bg}
              />
            )
          })}
          <FilterChip label="Unassigned" active={filterStaff === 'unassigned'} onClick={() => setFilterStaff('unassigned')} dotClass="bg-bridge-border-strong" />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bridge-bg mb-3">
            <Sparkles size={20} className="text-bridge-muted" />
          </div>
          <p className="text-bridge-muted text-body">
            {filterStaff !== 'all' ? 'No appointments match this filter.' : `No appointments ${isToday ? 'today' : 'on this day'} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => (
            <BookingActionCard key={b.id} booking={b} staff={staff} businessSlug={businessSlug} />
          ))}
        </div>
      )}
    </>
  )
}

function FilterChip({
  label, active, onClick, icon, dotClass,
}: {
  label: string; active: boolean; onClick: () => void; icon?: React.ReactNode; dotClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-caption font-semibold border transition-colors ${
        active ? 'bg-bridge-ink text-bridge-ink-foreground border-bridge-ink' : 'bg-bridge-card border-bridge-border text-bridge-secondary hover:border-bridge-border-strong'
      }`}
    >
      {dotClass && <span className={`w-2 h-2 rounded-full ${dotClass}`} />}
      {icon}
      {label}
    </button>
  )
}
