'use server'

import { updateBookingStatusSchema } from '@/validation/booking.schema'
import { BookingService } from '@/services/booking.service'
import { createServerClient } from '@/lib/supabase'
import { decideAccess, getAuthIdentity } from '@/lib/ownership'

export async function updateBookingStatus(formData: FormData) {
  const parsed = updateBookingStatusSchema.safeParse({
    bookingId: formData.get('bookingId'),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Ownership: confirm/decline is a business-owner action.
  const db = createServerClient()
  const [{ data: booking }, user] = await Promise.all([
    db
      .from('bookings')
      .select('id, businesses ( auth_user_id )')
      .eq('id', parsed.data.bookingId)
      .maybeSingle(),
    getAuthIdentity(),
  ])
  if (!booking) return { error: 'Booking not found' }
  const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
  if (!biz || decideAccess(user, biz) !== 'granted') {
    return { error: 'Not authorized to update this booking' }
  }

  try {
    await BookingService.updateStatus(parsed.data.bookingId, parsed.data.status)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update booking status' }
  }
}
