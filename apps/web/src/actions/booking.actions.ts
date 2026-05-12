'use server'

import { updateBookingStatusSchema } from '@/validation/booking.schema'
import { BookingService } from '@/services/booking.service'

export async function updateBookingStatus(formData: FormData) {
  const parsed = updateBookingStatusSchema.safeParse({
    bookingId: formData.get('bookingId'),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    await BookingService.updateStatus(parsed.data.bookingId, parsed.data.status)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update booking status' }
  }
}
