import { DashboardService, type AgendaBooking } from '@/services/dashboard.service'
import { LinkService } from '@/services/link.service'
import { BusinessService } from '@/services/business.service'
import { ContentService } from '@/services/content.service'
import { StaffService } from '@/services/staff.service'
import BusinessDashboard from '@/components/BusinessDashboard'
import { notFound } from 'next/navigation'

export interface DashboardSearchParams {
  date?: string
  view?: string
  tab?: string
  status?: string
}

type Tab = 'overview' | 'calendar' | 'bookings' | 'creators' | 'settings'
type View = 'day' | 'week' | 'month'

function pad(n: number) { return String(n).padStart(2, '0') }
function formatDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function startOfWeek(s: string) { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() - d.getDay()); return formatDate(d) }
function endOfWeek(ws: string) { const d = new Date(`${ws}T00:00:00`); d.setDate(d.getDate() + 6); return formatDate(d) }
function startOfMonth(s: string) { const d = new Date(`${s}T00:00:00`); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01` }
function endOfMonth(ms: string) { const d = new Date(`${ms}T00:00:00`); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}` }

/**
 * The business dashboard, fully loaded for a slug. Shared by the canonical
 * /dashboard/business/[slug] route and the slugless /business home (which
 * resolves the slug from the signed-in owner). Ownership must be verified by
 * the caller before rendering this.
 */
export default async function BusinessDashboardScreen({
  slug,
  searchParams,
}: {
  slug: string
  searchParams: DashboardSearchParams
}) {
  const sp = searchParams
  const today = formatDate(new Date())

  const tab: Tab =
    sp.tab === 'calendar' || sp.tab === 'bookings' || sp.tab === 'creators' || sp.tab === 'settings'
      ? sp.tab
      : 'overview'

  const view: View = (sp.view === 'week' || sp.view === 'month') ? sp.view : 'day'
  const baseDate = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today
  const status = sp.status ?? 'all'

  // Always-fetched data (cheap)
  const [data, pendingRequests, myCreators, pendingContent, stripeStatus, staff, todayAgenda] =
    await Promise.all([
      DashboardService.getBusinessDashboard(slug),
      LinkService.getPendingRequests(slug),
      LinkService.getMyCreators(slug),
      BusinessService.getPendingContent(slug),
      BusinessService.getStripeStatus(slug),
      StaffService.list(slug),
      DashboardService.getBookingsForDate(slug, today),
    ])
  if (!data) return notFound()

  // Live videos for this business — powers the per-creator video stats modal.
  const activeContent = await ContentService.listForBusiness(data.business.id)

  // Tab-specific
  let agenda: AgendaBooking[] = todayAgenda
  let rangeData: AgendaBooking[] = []
  let viewStartDate = baseDate
  let bookingsList: AgendaBooking[] = []

  if (tab === 'calendar') {
    if (view === 'day') {
      agenda = await DashboardService.getBookingsForDate(slug, baseDate)
    } else if (view === 'week') {
      viewStartDate = startOfWeek(baseDate)
      rangeData = await DashboardService.getBookingsForRange(slug, viewStartDate, endOfWeek(viewStartDate))
    } else {
      viewStartDate = startOfMonth(baseDate)
      rangeData = await DashboardService.getBookingsForRange(slug, viewStartDate, endOfMonth(viewStartDate))
    }
  } else if (tab === 'bookings') {
    bookingsList = await DashboardService.listBusinessBookings(slug, {
      status: status === 'all' ? undefined : (status as AgendaBooking['status']),
    })
  }

  const services = data.business.services.map((s) => ({
    id: s.id, name: s.name, duration: s.duration, price: s.price,
  }))

  return (
    <BusinessDashboard
      tab={tab}
      data={data}
      pendingRequests={pendingRequests}
      myCreators={myCreators}
      pendingContent={pendingContent}
      activeContent={activeContent}
      stripeConnected={stripeStatus.hasAccount}
      view={view}
      viewDate={tab === 'calendar' && view === 'day' ? baseDate : viewStartDate}
      agenda={agenda}
      rangeBookings={rangeData}
      todayAgenda={todayAgenda}
      bookingsList={bookingsList}
      bookingsStatus={status}
      services={services}
      staff={staff.map((s) => ({ id: s.id, name: s.name, serviceIds: s.serviceIds }))}
    />
  )
}
