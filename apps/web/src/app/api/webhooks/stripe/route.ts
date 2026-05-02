import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 400 })
  }

  const stripe = getStripe()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 },
    )
  }

  const db = createServerClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.booking_id
    if (bookingId) {
      await db
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          stripe_payment_intent_id: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        })
        .eq('id', bookingId)

      // Record booking_confirmed attribution event if linked
      const { data: booking } = await db
        .from('bookings')
        .select('link_id')
        .eq('id', bookingId)
        .single()
      if (booking?.link_id) {
        await db.from('attribution_events').insert({
          link_id: booking.link_id,
          booking_id: bookingId,
          event_type: 'booking_confirmed',
        })
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.booking_id
    if (bookingId) {
      await db
        .from('bookings')
        .update({ status: 'cancelled', payment_status: 'failed' })
        .eq('id', bookingId)
    }
  }

  return NextResponse.json({ received: true })
}
