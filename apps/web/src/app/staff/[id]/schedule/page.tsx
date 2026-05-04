import {
  getStaffById, getStaffSchedule, listStaffBlocks,
} from '@/lib/db'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import StaffSchedulePage from '@/components/StaffSchedulePage'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string; view?: string }>
}

function pad(n: number) { return String(n).padStart(2, '0') }
function formatDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function startOfWeek(s: string) { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() - d.getDay()); return formatDate(d) }
function endOfWeek(ws: string) { const d = new Date(`${ws}T00:00:00`); d.setDate(d.getDate() + 6); return formatDate(d) }
function startOfMonth(s: string) { const d = new Date(`${s}T00:00:00`); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01` }
function endOfMonth(ms: string) { const d = new Date(`${ms}T00:00:00`); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}` }

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const today = formatDate(new Date())

  if (!isSupabaseConfigured()) return notFound()
  const staff = await getStaffById(id)
  if (!staff) return notFound()

  const view = sp.view === 'month' || sp.view === 'day' ? sp.view : 'week'
  const baseDate = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today

  const db = createServerClient()
  const { data: biz } = await db
    .from('businesses')
    .select('slug, name')
    .eq('id', staff.businessId)
    .single()

  // Compute fetch range based on view
  let rangeStart = baseDate
  let rangeEnd = baseDate
  if (view === 'week') {
    rangeStart = startOfWeek(baseDate)
    rangeEnd = endOfWeek(rangeStart)
  } else if (view === 'month') {
    rangeStart = startOfMonth(baseDate)
    rangeEnd = endOfMonth(rangeStart)
  }

  // Fetch in range
  const { data: rows } = await db
    .from('bookings')
    .select(`
      id, customer_name, customer_email, booking_date, booking_time, status, is_walkin,
      services ( name, price, duration )
    `)
    .eq('staff_id', id)
    .gte('booking_date', rangeStart)
    .lte('booking_date', rangeEnd)
    .neq('status', 'cancelled')
    .neq('status', 'declined')
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = (rows ?? []).map((r: any) => {
    const svc = Array.isArray(r.services) ? r.services[0] : r.services
    const startMin = (() => {
      const [h, m] = String(r.booking_time).slice(0, 5).split(':').map(Number)
      return h * 60 + (m || 0)
    })()
    const duration = svc?.duration ?? 60
    const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    return {
      id: r.id as string,
      customerName: r.customer_name as string,
      serviceName: svc?.name ?? 'Service' as string,
      serviceDuration: duration,
      price: (svc?.price ?? 0) as number,
      date: r.booking_date as string,
      time: String(r.booking_time).slice(0, 5),
      endTime: fmt(startMin + duration),
      status: r.status as string,
      isWalkin: !!r.is_walkin,
    }
  })

  // Also fetch this week's bookings for the "next appointment" stat (regardless of view)
  let nextAppointment: { date: string; time: string; serviceName: string; customerName: string } | null = null
  if (view !== 'week') {
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(weekStart)
    const { data: weekRows } = await db
      .from('bookings')
      .select('booking_date, booking_time, customer_name, services(name)')
      .eq('staff_id', id)
      .gte('booking_date', today)
      .lte('booking_date', weekEnd)
      .neq('status', 'cancelled')
      .neq('status', 'declined')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })
      .limit(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = (weekRows ?? [])[0]
    if (r) {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      nextAppointment = {
        date: r.booking_date,
        time: String(r.booking_time).slice(0, 5),
        serviceName: svc?.name ?? 'Service',
        customerName: r.customer_name,
      }
    }
  } else {
    const upcoming = bookings.filter((b) => b.date >= today)
    if (upcoming[0]) {
      nextAppointment = {
        date: upcoming[0].date,
        time: upcoming[0].time,
        serviceName: upcoming[0].serviceName,
        customerName: upcoming[0].customerName,
      }
    }
  }

  // Weekly count for stats
  let weekCount = 0
  if (view === 'week') {
    weekCount = bookings.length
  } else {
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(weekStart)
    const { count } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('staff_id', id)
      .gte('booking_date', weekStart)
      .lte('booking_date', weekEnd)
      .neq('status', 'cancelled')
      .neq('status', 'declined')
    weekCount = count ?? 0
  }

  const [schedule, blocks] = await Promise.all([
    getStaffSchedule(id),
    listStaffBlocks(id),
  ])

  return (
    <StaffSchedulePage
      staff={staff}
      businessName={biz?.name ?? null}
      view={view}
      baseDate={baseDate}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      bookings={bookings}
      schedule={schedule}
      blocks={blocks}
      weekCount={weekCount}
      nextAppointment={nextAppointment}
    />
  )
}

export const dynamic = 'force-dynamic'
