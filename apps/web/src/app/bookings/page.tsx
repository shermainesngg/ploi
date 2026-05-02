import Link from 'next/link'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'My bookings — BRIDGE',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function BookingsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/bookings')
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-[480px] mx-auto px-5 py-10">
        <h1 className="text-2xl font-black text-stone-900">My bookings</h1>
        <p className="text-stone-500 text-sm mt-2">Connect Supabase to view bookings.</p>
      </div>
    )
  }

  const db = createServerClient()
  const { data: bookings } = await db
    .from('bookings')
    .select(`
      id, customer_name, booking_date, booking_time, status, payment_status, created_at,
      services ( name, price ),
      businesses ( slug, name, category, location )
    `)
    .eq('customer_email', user.email)
    .order('booking_date', { ascending: false })

  const list = bookings ?? []

  // Split upcoming vs past
  const today = new Date().toISOString().split('T')[0]
  const upcoming = list.filter((b) => b.booking_date >= today)
  const past = list.filter((b) => b.booking_date < today)

  return (
    <div className="max-w-[480px] mx-auto px-4 py-8 pb-24">
      <h1 className="text-2xl font-black text-stone-900 px-1">My bookings</h1>
      <p className="text-stone-500 text-sm mt-1 px-1">Booked under {user.email}</p>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-8 mt-6 text-center">
          <p className="text-stone-500 text-sm mb-4">No bookings yet.</p>
          <Link href="/" className="text-rose-600 font-semibold text-sm hover:underline">
            Browse places →
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 px-1">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((b) => <BookingRow key={b.id} booking={b} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 px-1">Past</h2>
              <div className="space-y-2">
                {past.map((b) => <BookingRow key={b.id} booking={b} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BookingRow({ booking }: { booking: any }) {
  const svc = Array.isArray(booking.services) ? booking.services[0] : booking.services
  const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
  const date = new Date(booking.booking_date)
  const time = (booking.booking_time as string)?.slice(0, 5)

  const status = booking.status as string
  const paid = booking.payment_status === 'paid'

  return (
    <Link
      href={`/booking-confirmed/${booking.id}`}
      className="block bg-white rounded-2xl border border-stone-100 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-stone-900 text-sm truncate">{svc?.name ?? 'Service'}</p>
            {paid && <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Paid</span>}
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
              status === 'confirmed' ? 'bg-green-100 text-green-700' :
              status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-stone-100 text-stone-500'
            }`}>{status}</span>
          </div>
          <p className="text-stone-500 text-xs truncate">{biz?.name}</p>
        </div>
        <span className="font-bold text-stone-900 text-sm flex-shrink-0">฿{(svc?.price ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-stone-400">
        <span className="flex items-center gap-1"><Calendar size={11} />{DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{time}</span>
        {biz?.location && <span className="flex items-center gap-1 truncate"><MapPin size={11} />{biz.location}</span>}
      </div>
    </Link>
  )
}
