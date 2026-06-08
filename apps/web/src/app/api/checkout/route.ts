import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase'
import { checkoutSchema } from '@/validation/checkout.schema'
import { CheckoutService } from '@/services/checkout.service'
import { BookingService } from '@/services/booking.service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = checkoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const input = parsed.data

    if (!isSupabaseConfigured()) {
      const booking = await BookingService.create({
        serviceId: input.serviceId,
        businessId: input.businessId,
        locationId: input.locationId ?? undefined,
        linkId: input.linkId ?? undefined,
        contentId: input.contentId ?? undefined,
        customerName: input.customerName,
        customerContact: input.customerEmail,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
      })
      return NextResponse.json({ mode: 'inapp', booking })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const result = await CheckoutService.process(input, origin)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
