import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { getStripe, isStripeConfigured, calculatePlatformFee } from '@/lib/stripe'
import { createBooking } from '@/lib/db'

/**
 * Body: { serviceId, businessId, linkId?, customerName, customerEmail, customerPhone,
 *         bookingDate, bookingTime }
 *
 * Routing:
 *   - Stripe configured → always create a Checkout Session.
 *       · business has stripe_account_id → destination charge (5% application_fee to platform)
 *       · no connected account → charge platform directly (MVP fallback)
 *   - Stripe NOT configured → in-app booking (no payment).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      serviceId, businessId, linkId,
      customerName, customerEmail, customerPhone,
      bookingDate, bookingTime,
    } = body

    if (!serviceId || !businessId || !customerName || !customerEmail || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      const booking = await createBooking({
        serviceId, businessId, linkId,
        customerName, customerContact: customerEmail,
        bookingDate, bookingTime,
      })
      return NextResponse.json({ mode: 'inapp', booking })
    }

    const db = createServerClient()
    const [{ data: service }, { data: business }] = await Promise.all([
      db.from('services').select('id, name, price').eq('id', serviceId).single(),
      db.from('businesses').select('id, slug, name, stripe_account_id').eq('id', businessId).single(),
    ])

    if (!service || !business) {
      return NextResponse.json({ error: 'Service or business not found' }, { status: 404 })
    }

    // ── Stripe path ──
    if (isStripeConfigured()) {
      const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const stripe = getStripe()

      // Pre-create the booking so we can attach the session id
      const { data: booking, error: bookErr } = await db
        .from('bookings')
        .insert({
          service_id: serviceId,
          business_id: businessId,
          link_id: linkId ?? null,
          customer_name: customerName,
          customer_contact: customerEmail,
          customer_email: customerEmail,
          customer_phone: customerPhone ?? null,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single()
      if (bookErr) throw new Error(bookErr.message)

      const amountCents = service.price * 100  // THB → satang
      const lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: 'thb',
            unit_amount: amountCents,
            product_data: {
              name: service.name,
              description: `${business.name} · ${bookingDate} ${bookingTime}`,
            },
          },
        },
      ]

      const successUrl = `${origin}/booking-confirmed/${booking.id}?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${origin}/`

      // Choose destination charge (with connected account) vs platform charge
      let session
      if (business.stripe_account_id) {
        session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: lineItems,
          customer_email: customerEmail,
          payment_intent_data: {
            application_fee_amount: calculatePlatformFee(amountCents),
            transfer_data: { destination: business.stripe_account_id },
            metadata: { booking_id: booking.id, link_id: linkId ?? '' },
          },
          metadata: { booking_id: booking.id, business_slug: business.slug },
          success_url: successUrl,
          cancel_url: cancelUrl,
        })
      } else {
        // MVP fallback: platform-only charge (no connected account yet)
        session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: lineItems,
          customer_email: customerEmail,
          payment_intent_data: {
            metadata: { booking_id: booking.id, link_id: linkId ?? '', no_connected_account: 'true' },
          },
          metadata: { booking_id: booking.id, business_slug: business.slug },
          success_url: successUrl,
          cancel_url: cancelUrl,
        })
      }

      await db.from('bookings').update({ stripe_session_id: session.id }).eq('id', booking.id)

      return NextResponse.json({ mode: 'stripe', url: session.url, sessionId: session.id })
    }

    // ── No Stripe configured: in-app booking ──
    const booking = await createBooking({
      serviceId, businessId, linkId,
      customerName, customerContact: customerEmail,
      bookingDate, bookingTime,
    })
    return NextResponse.json({ mode: 'inapp', booking })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
