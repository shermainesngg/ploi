import type { AgendaBooking } from '@/services/dashboard.service'
import type { GoogleSyncStatus } from '@/lib/types'

/**
 * A Schedule-X (v2) event. `start`/`end` are space-separated local datetimes
 * (`'YYYY-MM-DD HH:mm'`) — NOT ISO `T` — and carry no timezone: they're
 * wall-clock business-local times, the same convention the mobile agendas use.
 * `calendarId` is the booking status, which maps to a semantic status color in
 * PloiCalendar's `calendars` config. `syncStatus` is a custom passthrough field
 * for the per-event Google sync indicator.
 */
export interface SxEvent {
  id: string
  title: string
  start: string
  end: string
  calendarId: string
  syncStatus: GoogleSyncStatus | null
  // Custom passthrough fields for PloiCalendar's rich event renderer.
  customerName: string
  serviceName: string
  isWalkin: boolean
  isRepeat: boolean
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * `date` + `time` + duration → `'YYYY-MM-DD HH:mm'`, rolling over to the next
 * day(s) if the appointment crosses midnight. Pure wall-clock arithmetic — no
 * timezone math (Schedule-X renders these as-is).
 */
function addMinutes(date: string, time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = (h || 0) * 60 + (m || 0) + minutes
  const dayShift = Math.floor(total / 1440)
  const mins = ((total % 1440) + 1440) % 1440
  let outDate = date
  if (dayShift !== 0) {
    const d = new Date(`${date}T00:00:00`)
    d.setDate(d.getDate() + dayShift)
    outDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return `${outDate} ${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
}

/** Map dashboard agenda bookings to Schedule-X events. Pure — no Supabase. */
export function agendaToScheduleXEvents(bookings: AgendaBooking[]): SxEvent[] {
  return bookings.map((b) => {
    const startTime = b.time.slice(0, 5) // 'HH:mm'
    const duration = b.serviceDuration ?? 60
    return {
      id: b.id,
      title: `${b.customerName} · ${b.serviceName}`,
      start: `${b.date} ${startTime}`,
      end: addMinutes(b.date, startTime, duration),
      calendarId: b.status,
      syncStatus: b.googleSyncStatus,
      customerName: b.customerName,
      serviceName: b.serviceName,
      isWalkin: b.isWalkin,
      isRepeat: b.isRepeat,
    }
  })
}
