import { NextRequest, NextResponse } from 'next/server'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import { BusinessRepo } from '@/repositories/business.repo'
import { BookingRepo } from '@/repositories/booking.repo'
import { CalendarSyncService } from '@/services/calendar-sync.service'
import { isGoogleCalendarConfigured } from '@/lib/google-calendar'

/**
 * POST /api/businesses/:slug/google-calendar/resync
 *
 * Owner-only. Re-pushes future confirmed bookings that never synced (status null
 * or `failed`) — the manual repair for drift. Bounded to future bookings so a
 * large backlog can't hang the request; the sync service is fire-safe, so one
 * bad booking won't abort the loop.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 })
  }

  const access = await authorizeBusinessDashboard(slug)
  if (access === 'not_found') {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  if (access !== 'granted') {
    return NextResponse.json(
      { error: 'Not authorized to manage this business' },
      { status: access === 'unauthenticated' ? 401 : 403 },
    )
  }

  const businessId = await BusinessRepo.findIdBySlug(slug)
  if (!businessId) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const pending = await BookingRepo.findPendingSyncForBusiness(businessId)
  let resynced = 0
  let failed = 0
  for (const b of pending) {
    await CalendarSyncService.pushOnConfirm(b.id)
    // Re-read the row's status to count outcomes.
    const after = await BookingRepo.findForCalendarSync(b.id)
    if (after?.google_event_id) resynced += 1
    else failed += 1
  }

  return NextResponse.json({ resynced, failed })
}
