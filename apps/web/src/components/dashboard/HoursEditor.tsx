'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

interface HoursDraft { open: boolean; start: string; end: string }

/** "10:00-20:00" | "closed" | undefined → editable draft. */
function toDraft(value: string | undefined): HoursDraft {
  if (!value || value === 'closed') return { open: false, start: '10:00', end: '20:00' }
  const [start, end] = value.split('-')
  return { open: true, start: start ?? '10:00', end: end ?? '20:00' }
}

function draftsToHours(drafts: Record<DayKey, HoursDraft>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const d of DAY_ORDER) {
    out[d] = drafts[d].open ? `${drafts[d].start}-${drafts[d].end}` : 'closed'
  }
  return out
}

/**
 * Reusable weekly opening-hours editor. Seeds from `value` once on mount and
 * reports the full `Record<DayKey, "HH:MM-HH:MM"|"closed">` up via `onChange`.
 */
export default function HoursEditor({
  value,
  onChange,
}: {
  value: Record<string, string> | null | undefined
  onChange: (hours: Record<string, string>) => void
}) {
  const [hours, setHours] = useState<Record<DayKey, HoursDraft>>(() => {
    const out = {} as Record<DayKey, HoursDraft>
    for (const d of DAY_ORDER) out[d] = toDraft(value?.[d])
    return out
  })

  function commit(next: Record<DayKey, HoursDraft>) {
    setHours(next)
    onChange(draftsToHours(next))
  }

  function updateDay(d: DayKey, change: Partial<HoursDraft>) {
    commit({ ...hours, [d]: { ...hours[d], ...change } })
  }

  function setAllSame() {
    const m = hours.mon
    const next = {} as Record<DayKey, HoursDraft>
    for (const d of DAY_ORDER) next[d] = { ...m }
    commit(next)
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={setAllSame}
          className="flex items-center gap-1 text-xs font-semibold text-bridge-accent hover:bg-bridge-accent-wash px-2 py-1 rounded-md"
        >
          <Copy size={11} /> Same every day
        </button>
      </div>
      <div className="bg-bridge-bg rounded-2xl border border-bridge-border divide-y divide-bridge-border">
        {DAY_ORDER.map((d) => (
          <div key={d} className="flex items-center gap-2 px-3 py-2.5">
            <span className="text-sm font-semibold text-bridge-text w-10">{DAY_LABELS[d]}</span>
            <button
              type="button"
              onClick={() => updateDay(d, { open: !hours[d].open })}
              className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                hours[d].open ? 'bg-green-100 text-green-700' : 'bg-bridge-border text-bridge-muted'
              }`}
            >
              {hours[d].open ? 'Open' : 'Closed'}
            </button>
            {hours[d].open && (
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="time" value={hours[d].start}
                  onChange={(e) => updateDay(d, { start: e.target.value })}
                  className="border border-bridge-border rounded-md px-1.5 py-1 text-xs bg-bridge-card"
                />
                <span className="text-bridge-muted text-xs">–</span>
                <input
                  type="time" value={hours[d].end}
                  onChange={(e) => updateDay(d, { end: e.target.value })}
                  className="border border-bridge-border rounded-md px-1.5 py-1 text-xs bg-bridge-card"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
