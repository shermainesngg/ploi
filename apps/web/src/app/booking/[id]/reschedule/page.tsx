import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { PoweredByPloi } from '@/components/ui/Logo'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import RescheduleResponse from '@/components/RescheduleResponse'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}
function formatTime(t: string): string {
  return String(t).slice(0, 5)
}

export const metadata = { title: 'Reschedule request — PLOI' }

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token } = await searchParams

  if (!isSupabaseConfigured()) return notFound()

  const db = createServerClient()
  const { data: booking } = await db
    .from('bookings')
    .select(`
      id, booking_date, booking_time, status,
      reschedule_proposed_date, reschedule_proposed_time, reschedule_token,
      services ( name ),
      businesses ( name )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!booking) return notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc: any = Array.isArray(booking.services) ? booking.services[0] : booking.services
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const biz: any = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses

  const tokenValid = !!token && !!booking.reschedule_token && token === booking.reschedule_token
  const hasProposal = !!booking.reschedule_proposed_date

  return (
    <div className="min-h-screen bg-bridge-bg flex flex-col items-center px-5 py-12">
      <div className="max-w-[460px] w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-bridge-accent-soft">
            <CalendarClock size={34} className="text-bridge-accent" />
          </div>
          <h1 className="font-display text-heading text-bridge-heading mb-1">New time proposed</h1>
          <p className="text-bridge-muted text-body max-w-xs">
            {biz?.name} suggested a different time for your {svc?.name ? <span className="font-medium text-bridge-secondary">{svc.name}</span> : 'booking'}.
          </p>
        </div>

        {!tokenValid || !hasProposal ? (
          <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-6 text-center shadow-card">
            <p className="text-bridge-secondary text-body">
              This reschedule link is no longer active — it may have already been answered or replaced.
            </p>
            <Link
              href="/bookings"
              className="inline-block mt-4 text-bridge-accent font-semibold text-body hover:underline"
            >
              View my bookings →
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-5 shadow-card space-y-4">
              <div>
                <p className="text-micro uppercase tracking-wide text-bridge-muted mb-1">Originally requested</p>
                <p className="text-body text-bridge-secondary line-through">
                  {formatDate(booking.booking_date)} at {formatTime(booking.booking_time)}
                </p>
              </div>
              <div className="border-t border-bridge-border/60 pt-4">
                <p className="text-micro uppercase tracking-wide text-bridge-accent mb-1">Proposed new time</p>
                <p className="text-body-lg font-bold text-bridge-heading">
                  {formatDate(booking.reschedule_proposed_date)} at {formatTime(booking.reschedule_proposed_time)}
                </p>
              </div>
            </div>

            <RescheduleResponse bookingId={booking.id} token={token!} />
          </>
        )}

        <div className="flex justify-center mt-6">
          <PoweredByPloi />
        </div>
      </div>
    </div>
  )
}
