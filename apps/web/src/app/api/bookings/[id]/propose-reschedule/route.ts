import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { decideAccess, getAuthIdentity } from '@/lib/ownership'
import { NotificationService } from '@/services/notification.service'
import { getAvailableSlots } from '@/lib/availability'

/**
 * POST /api/bookings/[id]/propose-reschedule
 * Body: { bookingDate: 'YYYY-MM-DD', bookingTime: 'HH:MM' }
 *
 * Business-only. Proposes a new slot back to the customer for a PENDING booking
 * instead of moving it directly. The booking keeps its original time and stays
 * pending (so it keeps blocking its slot); the proposed time + a capability
 * token are stored, and the customer is emailed an accept/decline link.
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
    const { bookingDate, bookingTime } = await req.json()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate ?? '')) {
      return NextResponse.json({ error: 'bookingDate must be YYYY-MM-DD' }, { status: 400 })
    }
    if (!/^\d{2}:\d{2}/.test(bookingTime ?? '')) {
      return NextResponse.json({ error: 'bookingTime must be HH:MM' }, { status: 400 })
    }

    const db = createServerClient()
    const [{ data: booking }, user] = await Promise.all([
      db
        .from('bookings')
        .select('id, status, service_id, staff_id, location_id, businesses ( auth_user_id, slug )')
        .eq('id', id)
        .maybeSingle(),
      getAuthIdentity(),
    ])
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
    if (!biz || decideAccess(user, biz) !== 'granted') {
      return NextResponse.json(
        { error: 'Only the business can propose a reschedule' },
        { status: user ? 403 : 401 },
      )
    }

    // Proposing only makes sense for an unconfirmed booking.
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be proposed for reschedule' },
        { status: 409 },
      )
    }

    // Defense in depth: the modal already filters to free slots, but never trust
    // the client — re-check the chosen slot server-side (per-staff when assigned).
    const proposedTime = bookingTime.slice(0, 5)
    const availability = biz.slug
      ? await getAvailableSlots(
          biz.slug,
          bookingDate,
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
      return NextResponse.json(
        { error: 'That time isn’t available — pick another slot.' },
        { status: 409 },
      )
    }

    const token = randomUUID()
    const { error } = await db
      .from('bookings')
      .update({
        reschedule_proposed_date: bookingDate,
        reschedule_proposed_time: bookingTime,
        reschedule_proposed_at: new Date().toISOString(),
        reschedule_token: token,
      })
      .eq('id', id)
    if (error) throw new Error(error.message)

    // Email the customer the accept/decline link (fire-safe — never blocks).
    await NotificationService.notifyCustomerRescheduleProposed(id)

    return NextResponse.json({ id, proposed: { date: bookingDate, time: bookingTime } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
