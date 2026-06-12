import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { NotificationService } from '@/services/notification.service'
import { CalendarSyncService } from '@/services/calendar-sync.service'
import { getAvailableSlots } from '@/lib/availability'
import { isProposalLive } from '@/lib/reschedule'

/**
 * POST /api/bookings/[id]/reschedule-response
 * Body: { token: string, action: 'accept' | 'decline' }
 *
 * Customer-facing, authorised by the unguessable reschedule_token (the customer
 * is usually not logged in). Resolves a business-proposed reschedule:
 *   - accept  → booking moves to the proposed slot and is confirmed
 *   - decline → proposal cleared; booking stays pending at its original time
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { id } = await params
    const { token, action } = await req.json()

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 })
    }
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const db = createServerClient()
    const { data: booking } = await db
      .from('bookings')
      .select(
        'id, status, service_id, staff_id, location_id, reschedule_token, reschedule_proposed_date, reschedule_proposed_time, reschedule_proposed_at, businesses ( slug )',
      )
      .eq('id', id)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    // Token must match and a proposal must still be live (outstanding AND within
    // its hold window — isProposalLive covers the lazy 24h/appointment-proximity
    // expiry, not just a missing/mismatched token).
    if (
      !booking.reschedule_token ||
      booking.reschedule_token !== token ||
      !isProposalLive(booking)
    ) {
      return NextResponse.json(
        { error: 'This reschedule link is no longer valid.' },
        { status: 410 },
      )
    }

    const clearProposal = {
      reschedule_proposed_date: null,
      reschedule_proposed_time: null,
      reschedule_proposed_at: null,
      reschedule_token: null,
    }

    if (action === 'accept') {
      // Re-validate availability server-side before moving — the proposed slot
      // may have been taken since it was proposed (e.g. an external booking).
      // Never trust the client; never double-book. excludeBookingId keeps this
      // booking's own live proposal from self-conflicting in the engine. Per-staff
      // when the booking has an assigned therapist.
      const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
      const proposedDate = booking.reschedule_proposed_date as string
      const proposedTime = (booking.reschedule_proposed_time as string).slice(0, 5)
      const availability = biz?.slug
        ? await getAvailableSlots(
            biz.slug,
            proposedDate,
            booking.service_id ?? undefined,
            booking.staff_id ?? undefined,
            booking.location_id ?? undefined,
            booking.id,
          )
        : null
      const slotFree = !!availability?.groups.some((g) =>
        g.slots.some((s) => s.time === proposedTime && s.available),
      )
      if (!slotFree) {
        // Booking.com-style lapse: the proposed slot is gone. Clear the proposal
        // (back to plain pending at the original time) and tell the business so
        // they can re-propose or confirm the original.
        const { error } = await db.from('bookings').update(clearProposal).eq('id', id)
        if (error) throw new Error(error.message)
        await NotificationService.notifyBusinessProposedSlotTaken(id)
        return NextResponse.json(
          { error: 'That time was just taken — the business will suggest another.' },
          { status: 409 },
        )
      }

      // Reschedule mutates this same booking row — link_id / acquisition lineage
      // and commission tier stay frozen. Never reimplement as cancel-and-rebook
      // (would re-trigger first-vs-repeat attribution).
      const { error } = await db
        .from('bookings')
        .update({
          booking_date: booking.reschedule_proposed_date,
          booking_time: booking.reschedule_proposed_time,
          status: 'confirmed',
          ...clearProposal,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)

      await NotificationService.notifyBusinessRescheduleResponse(id, true)
      await CalendarSyncService.pushOnConfirm(id)
    } else {
      const { error } = await db.from('bookings').update(clearProposal).eq('id', id)
      if (error) throw new Error(error.message)

      await NotificationService.notifyBusinessRescheduleResponse(id, false)
    }

    return NextResponse.json({ id, action })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
