import { BookingRepo } from '@/repositories/booking.repo'
import { BusinessRepo } from '@/repositories/business.repo'
import { getCalendarClient, isGoogleCalendarConfigured } from '@/lib/google-calendar'
import { decryptSecret } from '@/lib/crypto'

/**
 * One-way push of confirmed PLOI bookings into the business's connected Google
 * Calendar.
 *
 * Modeled on `notification.service.ts`: every method is fire-safe — it catches
 * and logs its own errors so a Google outage (or an unconfigured / unconnected
 * business) can never break a booking flow. On failure it best-effort marks the
 * booking `google_sync_status = 'failed'` so the dashboard can surface drift and
 * offer a manual Re-sync.
 */

const DEFAULT_DURATION_MIN = 60

/** Supabase embeds can come back as a single object or a 1-element array. */
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

/** Pull an HTTP status off a googleapis/Gaxios error, whatever shape it takes. */
function httpStatus(err: unknown): number | undefined {
  const e = err as { code?: number | string; status?: number; response?: { status?: number } }
  const raw = e?.response?.status ?? e?.status ?? e?.code
  return typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
}

/**
 * Compose naive wall-clock start/end datetimes for the event. `booking_date`
 * (YYYY-MM-DD) and `booking_time` (HH:mm[:ss]) carry no timezone — we hand
 * Google the local datetime plus the stored calendar timezone and let it place
 * the event. Computed in UTC purely to add minutes without server-tz drift; the
 * result is still a naive local string.
 */
function eventTimes(bookingDate: string, bookingTime: string, durationMin: number) {
  const time = bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime.slice(0, 8)
  const [y, mo, d] = bookingDate.split('-').map(Number)
  const [h, mi, se] = time.split(':').map(Number)
  const startMs = Date.UTC(y, mo - 1, d, h, mi, se || 0)
  const endIso = new Date(startMs + durationMin * 60_000).toISOString()
  return {
    startDateTime: `${bookingDate}T${time}`,
    endDateTime: endIso.slice(0, 19), // 'YYYY-MM-DDTHH:mm:ss' — naive, tagged with timeZone
  }
}

type SyncBooking = NonNullable<Awaited<ReturnType<typeof BookingRepo.findForCalendarSync>>>
type GoogleCreds = NonNullable<Awaited<ReturnType<typeof BusinessRepo.getGoogleCreds>>>

function buildEventBody(booking: SyncBooking, timezone: string | null) {
  const service = one(booking.services as { name?: string; duration?: number | null } | null)
  const duration = service?.duration ?? DEFAULT_DURATION_MIN
  const { startDateTime, endDateTime } = eventTimes(
    booking.booking_date,
    booking.booking_time,
    duration,
  )
  const tz = timezone ?? undefined
  const descriptionLines: string[] = []
  if (booking.customer_phone) descriptionLines.push(`Phone: ${booking.customer_phone}`)
  descriptionLines.push('Booked via PLOI')
  return {
    summary: `${booking.customer_name} — ${service?.name ?? 'Booking'}`,
    description: descriptionLines.join('\n'),
    start: { dateTime: startDateTime, timeZone: tz },
    end: { dateTime: endDateTime, timeZone: tz },
  }
}

/** Load the booking + its business's Google creds. Returns null if not syncable. */
async function loadContext(
  bookingId: string,
): Promise<{ booking: SyncBooking; creds: GoogleCreds; refreshToken: string } | null> {
  const booking = await BookingRepo.findForCalendarSync(bookingId)
  if (!booking) return null
  const creds = await BusinessRepo.getGoogleCreds(booking.business_id)
  if (!creds?.google_refresh_token) return null // business not connected → no-op
  return { booking, creds, refreshToken: decryptSecret(creds.google_refresh_token) }
}

/** Best-effort failure marker — itself fire-safe. */
async function markFailed(bookingId: string): Promise<void> {
  try {
    await BookingRepo.setGoogleSync(bookingId, { google_sync_status: 'failed' })
  } catch (err) {
    console.error(`[calendar-sync] could not mark ${bookingId} as failed:`, err)
  }
}

/**
 * Create or update the event for a confirmed booking. Patches in place when an
 * event already exists (covers a confirm-then-reschedule), inserts otherwise.
 * Only inserts for confirmed bookings — a pending/rescheduled-but-unconfirmed
 * booking with no event is left untouched.
 */
async function upsertEvent(bookingId: string): Promise<void> {
  const ctx = await loadContext(bookingId)
  if (!ctx) return
  const { booking, creds, refreshToken } = ctx
  if (!booking.google_event_id && booking.status !== 'confirmed') return

  const calendar = getCalendarClient(refreshToken)
  const calendarId = creds.google_calendar_id ?? 'primary'
  const requestBody = buildEventBody(booking, creds.google_calendar_timezone)

  let eventId = booking.google_event_id
  if (eventId) {
    await calendar.events.patch({ calendarId, eventId, requestBody })
  } else {
    const res = await calendar.events.insert({ calendarId, requestBody })
    eventId = res.data.id ?? null
  }

  await BookingRepo.setGoogleSync(bookingId, {
    google_event_id: eventId,
    google_sync_status: 'synced',
    google_synced_at: new Date().toISOString(),
  })
}

export const CalendarSyncService = {
  /** A booking became `confirmed` (or a paid booking arrived confirmed). */
  async pushOnConfirm(bookingId: string): Promise<void> {
    if (!isGoogleCalendarConfigured()) return
    try {
      await upsertEvent(bookingId)
    } catch (err) {
      console.error(`[calendar-sync] confirm push failed for ${bookingId}:`, err)
      await markFailed(bookingId)
    }
  },

  /** A confirmed booking was rescheduled — move its event (or create if missing). */
  async updateOnReschedule(bookingId: string): Promise<void> {
    if (!isGoogleCalendarConfigured()) return
    try {
      await upsertEvent(bookingId)
    } catch (err) {
      console.error(`[calendar-sync] reschedule push failed for ${bookingId}:`, err)
      await markFailed(bookingId)
    }
  },

  /** A booking was cancelled/declined — delete its event if one exists. */
  async deleteOnCancel(bookingId: string): Promise<void> {
    if (!isGoogleCalendarConfigured()) return
    try {
      const ctx = await loadContext(bookingId)
      if (!ctx) return
      const { booking, creds, refreshToken } = ctx
      if (!booking.google_event_id) return // nothing to delete (e.g. declined)

      const calendar = getCalendarClient(refreshToken)
      const calendarId = creds.google_calendar_id ?? 'primary'
      try {
        await calendar.events.delete({ calendarId, eventId: booking.google_event_id })
      } catch (err) {
        const status = httpStatus(err)
        if (status !== 404 && status !== 410) throw err
        // 404/410 → event already gone; treat as success.
      }

      await BookingRepo.setGoogleSync(bookingId, {
        google_event_id: null,
        google_sync_status: null,
        google_synced_at: null,
      })
    } catch (err) {
      console.error(`[calendar-sync] cancel delete failed for ${bookingId}:`, err)
      await markFailed(bookingId)
    }
  },
}
