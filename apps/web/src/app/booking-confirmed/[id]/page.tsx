import Link from 'next/link'
import { Check, Clock } from 'lucide-react'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Payment-finalisation guard:
 * If the user just came back from Stripe but the webhook hasn't fired yet,
 * fetch the session synchronously and update the booking. This keeps the
 * confirmation page accurate regardless of webhook timing.
 */
async function reconcileWithStripe(bookingId: string, sessionId: string) {
  if (!isStripeConfigured() || !isSupabaseConfigured()) return
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid') {
      const db = createServerClient()
      const piId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null
      await db.from('bookings').update({
        status: 'confirmed',
        payment_status: 'paid',
        stripe_payment_intent_id: piId,
      }).eq('id', bookingId)

      // Record attribution if linked
      const { data: booking } = await db
        .from('bookings').select('link_id').eq('id', bookingId).single()
      if (booking?.link_id) {
        // Avoid duplicate insert if webhook already handled it
        const { data: existing } = await db
          .from('attribution_events')
          .select('id')
          .eq('booking_id', bookingId)
          .eq('event_type', 'booking_confirmed')
          .maybeSingle()
        if (!existing) {
          await db.from('attribution_events').insert({
            link_id: booking.link_id,
            booking_id: bookingId,
            event_type: 'booking_confirmed',
          })
        }
      }
    }
  } catch {
    // Webhook will handle it eventually; don't block the page.
  }
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { session_id } = await searchParams

  if (!isSupabaseConfigured()) return notFound()

  // If we have a session_id, reconcile state before rendering
  if (session_id) await reconcileWithStripe(id, session_id)

  const db = createServerClient()
  const { data: booking } = await db
    .from('bookings')
    .select(`
      id, customer_name, customer_email, booking_date, booking_time,
      status, payment_status,
      services ( name, price ),
      businesses ( slug, name, contact_phone )
    `)
    .eq('id', id)
    .single()

  if (!booking) return notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc: any = Array.isArray(booking.services) ? booking.services[0] : booking.services
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const biz: any = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses

  const date = new Date(booking.booking_date)
  const isPaid = booking.payment_status === 'paid'
  const isPending = booking.payment_status === 'pending' && !!session_id

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center px-5 py-12">
      <div className="max-w-[460px] w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${
            isPaid ? 'bg-rose-100' : isPending ? 'bg-amber-100' : 'bg-stone-100'
          }`}>
            {isPending ? (
              <Clock size={36} className="text-amber-600" />
            ) : (
              <Check size={36} className="text-rose-600" strokeWidth={3} />
            )}
          </div>
          <h1 className="text-3xl font-black text-stone-900 mb-1">
            {isPending ? 'Finalising payment…' : "You're booked!"}
          </h1>
          <p className="text-stone-500 text-sm max-w-xs">
            {isPaid
              ? `Payment received. ${biz?.name} will see you soon.`
              : isPending
              ? 'Your card was charged — confirmation will appear here in a moment.'
              : `Booking submitted. ${biz?.name} will see you soon.`}
          </p>
          {isPending && (
            <p className="text-stone-400 text-xs mt-2">Refresh in a few seconds.</p>
          )}
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Service</span>
            <span className="font-semibold text-stone-900">{svc?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Where</span>
            <span className="font-semibold text-stone-900">{biz?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Date & time</span>
            <span className="font-semibold text-stone-900">
              {DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]} at {booking.booking_time?.toString().slice(0, 5)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Name</span>
            <span className="font-semibold text-stone-900">{booking.customer_name}</span>
          </div>
          {booking.customer_email && (
            <div className="flex justify-between">
              <span className="text-stone-500">Email</span>
              <span className="font-semibold text-stone-900 truncate ml-2">{booking.customer_email}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-3">
            <span className="text-stone-500">Total</span>
            <span className="font-bold text-stone-900 text-base">
              ฿{(svc?.price ?? 0).toLocaleString()}
              {isPaid && <span className="ml-2 text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Paid</span>}
              {isPending && <span className="ml-2 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>}
            </span>
          </div>
          <div className="text-xs text-stone-400 pt-2 border-t border-stone-100">
            Confirmation #{booking.id.slice(0, 8).toUpperCase()}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Link
            href="/bookings"
            className="block text-center w-full py-4 rounded-2xl bg-stone-900 text-white font-semibold text-base hover:bg-stone-800"
          >
            View my bookings
          </Link>
          <Link
            href={biz?.slug ? `/glowwithsara/${biz.slug}` : '/'}
            className="block text-center w-full py-3 rounded-2xl border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50"
          >
            Book another service
          </Link>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Powered by <span className="font-black text-rose-600">BRIDGE</span>
        </p>
      </div>
    </div>
  )
}
