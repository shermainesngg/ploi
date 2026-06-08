import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { decideAccess, getAuthIdentity } from '@/lib/ownership'
import { NotificationService } from '@/services/notification.service'
import { PaymentService, type RefundResult } from '@/services/payment.service'

const VALID_STATUSES = ['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show'] as const
type BookingStatus = (typeof VALID_STATUSES)[number]

/** Statuses the booking's customer may set on their own booking. */
const CUSTOMER_STATUSES: BookingStatus[] = ['cancelled']

/**
 * PATCH /api/bookings/[id]
 * Body: { status?, bookingDate?, bookingTime?, staffId? }
 *   - status: any of pending|confirmed|declined|cancelled|completed|no_show
 *   - bookingDate / bookingTime: reschedule (both required together)
 *
 * Authorization:
 *   - The owning business (or an unclaimed/demo business) may update anything.
 *   - The booking's customer (auth email matches customer_email) may only
 *     cancel or reschedule.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, bookingDate, bookingTime, staffId } = body

    const db = createServerClient()

    // ── Ownership ────────────────────────────────────────────────────────────
    const [{ data: booking }, user] = await Promise.all([
      db
        .from('bookings')
        .select('id, customer_email, businesses ( auth_user_id )')
        .eq('id', id)
        .maybeSingle(),
      getAuthIdentity(),
    ])
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
    const isBusinessOwner = !!biz && decideAccess(user, biz) === 'granted'
    const isCustomer =
      !!user?.email &&
      !!booking.customer_email &&
      user.email.toLowerCase() === (booking.customer_email as string).toLowerCase()

    if (!isBusinessOwner && !isCustomer) {
      return NextResponse.json(
        { error: 'Not authorized to update this booking' },
        { status: user ? 403 : 401 },
      )
    }

    // ── Build + validate the update ──────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {}

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `status must be one of ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        )
      }
      if (!isBusinessOwner && !CUSTOMER_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Customers can only set status to ${CUSTOMER_STATUSES.join(', ')}` },
          { status: 403 },
        )
      }
      update.status = status as BookingStatus
      if (status === 'completed') update.completed_at = new Date().toISOString()
    }

    if (staffId !== undefined) {
      if (!isBusinessOwner) {
        return NextResponse.json(
          { error: 'Only the business can reassign staff' },
          { status: 403 },
        )
      }
      update.staff_id = staffId === null || staffId === '' ? null : staffId
    }

    if (bookingDate !== undefined && bookingTime !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
        return NextResponse.json({ error: 'bookingDate must be YYYY-MM-DD' }, { status: 400 })
      }
      if (!/^\d{2}:\d{2}/.test(bookingTime)) {
        return NextResponse.json({ error: 'bookingTime must be HH:MM' }, { status: 400 })
      }
      update.booking_date = bookingDate
      update.booking_time = bookingTime
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { error } = await db.from('bookings').update(update).eq('id', id)
    if (error) throw new Error(error.message)

    // ── Refund: a declined/cancelled paid booking gets its money back ──────
    let refund: RefundResult | undefined
    if (update.status === 'declined' || update.status === 'cancelled') {
      refund = await PaymentService.refundBookingPayment(id)
    }

    // ── Notifications (actor-based; never block the response on failure) ────
    if (update.status === 'confirmed' || update.status === 'declined' || update.status === 'cancelled') {
      if (isBusinessOwner) {
        await NotificationService.notifyCustomerStatusChange(id, update.status)
      } else if (update.status === 'cancelled') {
        // Customer cancelled their own booking — tell the business.
        await NotificationService.notifyBusinessCancellation(id)
      }
    }

    return NextResponse.json({ id, ...update, ...(refund ? { refund } : {}) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
