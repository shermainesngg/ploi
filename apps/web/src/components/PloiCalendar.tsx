'use client'

import { useEffect, useMemo, useState } from 'react'
import { useNextCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
  createViewMonthAgenda,
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import '@schedule-x/theme-default/dist/index.css'
import type { SxEvent } from '@/lib/calendar-events'

interface Props {
  events: SxEvent[]
  /** Initial date the grid opens on (Schedule-X owns navigation after that). */
  selectedDate: string
  onEventClick?: (id: string) => void
  /** Empty-slot click — `dateTime` is `'YYYY-MM-DD HH:mm'`. */
  onSlotClick?: (dateTime: string) => void
}

/**
 * Per-status calendars → the retained semantic status palette (green confirmed /
 * amber pending / red cancelled+declined / neutral completed / rose no-show).
 * Coral is deliberately NOT used here — it stays a guest reserved for money/CTAs.
 */
const calendars = {
  confirmed: {
    colorName: 'confirmed',
    lightColors: { main: '#15803d', container: '#d6f3df', onContainer: '#0f3d22' },
    darkColors: { main: '#5fe09a', container: '#16361f', onContainer: '#d9f7e3' },
  },
  pending: {
    colorName: 'pending',
    lightColors: { main: '#b45309', container: '#fbeccb', onContainer: '#5c3408' },
    darkColors: { main: '#fbbf24', container: '#3a2c0c', onContainer: '#fcefc9' },
  },
  cancelled: {
    colorName: 'cancelled',
    lightColors: { main: '#94908a', container: '#ece9e3', onContainer: '#5a564f' },
    darkColors: { main: '#9b968d', container: '#26282c', onContainer: '#d6d3cc' },
  },
  declined: {
    colorName: 'declined',
    lightColors: { main: '#94908a', container: '#ece9e3', onContainer: '#5a564f' },
    darkColors: { main: '#9b968d', container: '#26282c', onContainer: '#d6d3cc' },
  },
  completed: {
    colorName: 'completed',
    lightColors: { main: '#6b7280', container: '#e4e7ea', onContainer: '#374151' },
    darkColors: { main: '#9aa3af', container: '#222831', onContainer: '#dfe3e8' },
  },
  no_show: {
    colorName: 'no_show',
    lightColors: { main: '#e11d48', container: '#fcdfe4', onContainer: '#7d1530' },
    darkColors: { main: '#fb7185', container: '#3d1620', onContainer: '#ffe0e5' },
  },
}

const hhmm = (dt: string) => String(dt).slice(11, 16)

/** Small status dot: quiet for synced, coral for failed (a negative needing attention). */
function SyncDot({ status }: { status: SxEvent['syncStatus'] }) {
  if (status === 'synced') {
    return (
      <span
        title="Synced to Google Calendar"
        className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0"
      />
    )
  }
  if (status === 'failed') {
    return (
      <span
        title="Google Calendar sync failed"
        className="inline-block w-1.5 h-1.5 rounded-full bg-bridge-accent flex-shrink-0"
      />
    )
  }
  return null
}

function EventTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[8.5px] font-bold uppercase tracking-wide leading-none px-1 py-0.5 rounded bg-black/[0.07] dark:bg-white/[0.14]">
      {children}
    </span>
  )
}

/** Rich event for the day/week time grid: time, customer, service, badges, sync dot. */
function TimeGridEvent({ calendarEvent }: { calendarEvent: SxEvent }) {
  return (
    <div className="h-full w-full px-2 py-1 overflow-hidden leading-snug">
      <div className="flex items-center gap-1 text-[10px] font-data opacity-80">
        <span className="truncate">{hhmm(calendarEvent.start)}–{hhmm(calendarEvent.end)}</span>
        <SyncDot status={calendarEvent.syncStatus} />
      </div>
      <p className="text-[12.5px] font-semibold truncate">{calendarEvent.customerName}</p>
      <p className="text-[11px] opacity-80 truncate">{calendarEvent.serviceName}</p>
      {(calendarEvent.isWalkin || calendarEvent.isRepeat) && (
        <div className="flex gap-1 mt-1">
          {calendarEvent.isWalkin && <EventTag>Walk-in</EventTag>}
          {calendarEvent.isRepeat && <EventTag>Repeat</EventTag>}
        </div>
      )}
    </div>
  )
}

/** Compact one-line chip for month-grid cells. */
function MonthGridEvent({ calendarEvent }: { calendarEvent: SxEvent }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] leading-tight overflow-hidden">
      <span className="font-data opacity-75 flex-shrink-0">{hhmm(calendarEvent.start)}</span>
      <span className="font-medium truncate">{calendarEvent.customerName}</span>
      <SyncDot status={calendarEvent.syncStatus} />
    </div>
  )
}

/** Row for the month-agenda list view. */
function MonthAgendaEvent({ calendarEvent }: { calendarEvent: SxEvent }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-[12px] overflow-hidden">
      <span className="font-data text-[10px] opacity-75 whitespace-nowrap">
        {hhmm(calendarEvent.start)}–{hhmm(calendarEvent.end)}
      </span>
      <span className="font-semibold truncate">{calendarEvent.customerName}</span>
      <span className="opacity-70 truncate">· {calendarEvent.serviceName}</span>
      <SyncDot status={calendarEvent.syncStatus} />
    </div>
  )
}

/** Read the app's current theme from the `<html class="dark">` flag. */
function isDarkNow(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export default function PloiCalendar({ events, selectedDate, onEventClick, onSlotClick }: Props) {
  // One events-service instance for the calendar's lifetime; lets us push event
  // updates without re-initializing the whole app.
  const eventsService = useMemo(() => createEventsServicePlugin(), [])

  const calendar = useNextCalendarApp(
    {
      views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
      // Open on the month grid so the whole schedule is visible at a glance;
      // users can drill into week/day via Schedule-X's own view switcher.
      defaultView: createViewMonthGrid().name,
      selectedDate,
      events,
      calendars,
      isDark: isDarkNow(),
      callbacks: {
        onEventClick(event) {
          onEventClick?.(String(event.id))
        },
        onClickDateTime(dateTime) {
          onSlotClick?.(dateTime)
        },
      },
    },
    [eventsService],
  )

  // Keep events in sync when the dashboard re-renders with a new range/data.
  useEffect(() => {
    if (calendar) eventsService.set(events)
  }, [events, calendar, eventsService])

  // Flip the calendar theme when the app toggles light/dark.
  const [, setDark] = useState(isDarkNow())
  useEffect(() => {
    if (!calendar) return
    const apply = () => {
      const dark = isDarkNow()
      setDark(dark)
      calendar.setTheme(dark ? 'dark' : 'light')
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [calendar])

  return (
    <ScheduleXCalendar
      calendarApp={calendar}
      customComponents={{
        timeGridEvent: TimeGridEvent,
        dateGridEvent: TimeGridEvent,
        monthGridEvent: MonthGridEvent,
        monthAgendaEvent: MonthAgendaEvent,
      }}
    />
  )
}
