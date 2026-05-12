import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import BookingsList from '@/components/BookingsList'

export const metadata = {
  title: 'My bookings — BRIDGE',
}

export default async function BookingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/bookings')

  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="font-display text-heading text-bridge-heading">My bookings</h1>
        <p className="text-bridge-muted text-body mt-2">Connect Supabase to view bookings.</p>
      </div>
    )
  }

  const db = createServerClient()
  const { data: bookings } = await db
    .from('bookings')
    .select(`
      id, customer_name, booking_date, booking_time, status, payment_status, service_id,
      services ( name, price ),
      businesses ( slug, name, category, location )
    `)
    .eq('customer_email', user.email)
    .order('booking_date', { ascending: false })

  return <BookingsList bookings={bookings ?? []} userEmail={user.email} />
}
