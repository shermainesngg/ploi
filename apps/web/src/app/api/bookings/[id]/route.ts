import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'

const VALID_STATUSES = ['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show'] as const
type BookingStatus = (typeof VALID_STATUSES)[number]

/**
 * PATCH /api/bookings/[id]
 * Body: { status?, bookingDate?, bookingTime? }
 *   - status: any of pending|confirmed|declined|cancelled|completed|no_show
 *   - bookingDate / bookingTime: reschedule (both required together)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {}

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `status must be one of ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        )
      }
      update.status = status as BookingStatus
      if (status === 'completed') update.completed_at = new Date().toISOString()
    }

    if (staffId !== undefined) {
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

    const db = createServerClient()
    const { error } = await db.from('bookings').update(update).eq('id', id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ id, ...update })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
