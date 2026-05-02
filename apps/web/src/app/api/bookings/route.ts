import { NextRequest, NextResponse } from 'next/server'
import { createBooking } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { serviceId, businessId, linkId, customerName, customerContact, bookingDate, bookingTime } = body

    if (!serviceId || !businessId || !customerName || !customerContact || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const booking = await createBooking({
      serviceId,
      businessId,
      linkId,
      customerName,
      customerContact,
      bookingDate,
      bookingTime,
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
