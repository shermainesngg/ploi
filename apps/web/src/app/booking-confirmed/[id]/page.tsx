import Link from 'next/link'
import { Check, Clock } from 'lucide-react'
import { PoweredByPloi } from '@/components/ui/Logo'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

      const { data: booking } = await db
        .from('bookings').select('link_id').eq('id', bookingId).single()
      if (booking?.link_id) {
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
    // Webhook will handle it eventually
  }
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { session_id } = await searchParams

  if (!isSupabaseConfigured()) return notFound()

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
    <div className="min-h-screen bg-bridge-bg flex flex-col items-center px-5 py-12">
      <div className="max-w-[460px] w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${
            isPaid ? 'bg-bridge-accent-soft' : isPending ? 'bg-amber-100' : 'bg-bridge-surface'
          }`}>
            {isPending ? (
              <Clock size={36} className="text-amber-600" />
            ) : (
              <Check size={36} className="text-bridge-accent" strokeWidth={3} />
            )}
          </div>
          <h1 className="font-display text-heading text-bridge-heading mb-1">
            {isPending ? 'Finalising payment…' : "You're booked!"}
          </h1>
          <p className="text-bridge-muted text-body max-w-xs">
            {isPaid
              ? `Payment received. ${biz?.name} will see you soon.`
              : isPending
              ? 'Your card was charged — confirmation will appear here in a moment.'
              : `Booking submitted. ${biz?.name} will see you soon.`}
          </p>
          {isPending && (
            <p className="text-bridge-muted text-caption mt-2">Refresh in a few seconds.</p>
          )}
        </div>

        {/* Summary card */}
        <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-5 shadow-card space-y-3 text-body">
          <div className="flex justify-between">
            <span className="text-bridge-muted">Service</span>
            <span className="font-semibold text-bridge-heading">{svc?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-bridge-muted">Where</span>
            <span className="font-semibold text-bridge-heading">{biz?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-bridge-muted">Date & time</span>
            <span className="font-semibold text-bridge-heading">
              {DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]} at {booking.booking_time?.toString().slice(0, 5)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-bridge-muted">Name</span>
            <span className="font-semibold text-bridge-heading">{booking.customer_name}</span>
          </div>
          {booking.customer_email && (
            <div className="flex justify-between">
              <span className="text-bridge-muted">Email</span>
              <span className="font-semibold text-bridge-heading truncate ml-2">{booking.customer_email}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-bridge-border pt-3">
            <span className="text-bridge-muted">Total</span>
            <span className="font-bold text-bridge-heading text-base">
              ฿{(svc?.price ?? 0).toLocaleString()}
              {isPaid && <span className="ml-2 text-micro font-bold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Paid</span>}
              {isPending && <span className="ml-2 text-micro font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Paid</span>}
            </span>
          </div>
          <div className="text-caption text-bridge-muted pt-2 border-t border-bridge-border/60">
            Confirmation #{booking.id.slice(0, 8).toUpperCase()}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Link
            href="/bookings"
            className="block text-center w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-body hover:bg-bridge-accent-dark transition-colors"
          >
            View my bookings
          </Link>
          <Link
            href={biz?.slug ? `/shop/${biz.slug}` : '/'}
            className="block text-center w-full py-3 rounded-2xl border border-bridge-border text-bridge-text text-body font-semibold hover:bg-bridge-surface transition-colors"
          >
            Book another service
          </Link>
        </div>

        <div className="flex justify-center mt-6">
          <PoweredByPloi />
        </div>
      </div>
    </div>
  )
}
