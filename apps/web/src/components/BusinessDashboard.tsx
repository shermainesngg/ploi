'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'
import { ArrowLeft, Wallet, LayoutGrid, Calendar, Inbox, Users, Plus } from 'lucide-react'
import type { BusinessDashboardData } from '@/lib/types'
import type { PendingLinkRequest, MyCreatorEntry, AgendaBooking } from '@/lib/db'
import DailyAgenda from './DailyAgenda'
import WeeklyAgenda from './WeeklyAgenda'
import MonthlyAgenda from './MonthlyAgenda'
import WalkinModal from './WalkinModal'
import OverviewTab from './dashboard/OverviewTab'
import BookingsTab from './dashboard/BookingsTab'
import CreatorsTab from './dashboard/CreatorsTab'

type Tab = 'overview' | 'calendar' | 'bookings' | 'creators'
type ScheduleView = 'day' | 'week' | 'month'

interface Props {
  tab: Tab
  data: BusinessDashboardData
  pendingRequests: PendingLinkRequest[]
  myCreators: MyCreatorEntry[]
  stripeConnected: boolean
  view: ScheduleView
  viewDate: string
  agenda: AgendaBooking[]
  rangeBookings: AgendaBooking[]
  todayAgenda: AgendaBooking[]
  bookingsList: AgendaBooking[]
  bookingsStatus: string
  services: Array<{ id: string; name: string; duration: number; price: number }>
  staff: Array<{ id: string; name: string; serviceIds: string[] }>
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { key: 'calendar', label: 'Calendar', icon: <Calendar size={14} /> },
  { key: 'bookings', label: 'Bookings', icon: <Inbox size={14} /> },
  { key: 'creators', label: 'Creators', icon: <Users size={14} /> },
]

export default function BusinessDashboard(props: Props) {
  const {
    tab, data, pendingRequests, myCreators, stripeConnected,
    view, viewDate, agenda, rangeBookings, todayAgenda,
    bookingsList, bookingsStatus, services, staff,
  } = props
  const { business } = data
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [showWalkin, setShowWalkin] = useState(false)

  async function connectStripe() {
    setConnecting(true)
    try {
      const res = await fetch(`/api/businesses/${business.slug}/connect-stripe`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed')
      window.location.href = d.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start Stripe onboarding')
      setConnecting(false)
    }
  }

  // Pending count for the Bookings tab badge
  const pendingBookingCount = data.bookings.filter((b) => b.status === 'pending').length
  const creatorActionCount = pendingRequests.length

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[480px] mx-auto pb-24">
        {/* Header */}
        <div className="relative">
          {business.coverPhotoUrl ? (
            <div className="absolute inset-0">
              <img src={business.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
            </div>
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${business.coverGradient[0]}, ${business.coverGradient[1]})` }} />
          )}
          <div className="relative px-5 pt-8 pb-8">
            <NextLink
              href={`/glowwithsara/${business.slug}`}
              className="flex items-center gap-1 text-white/80 text-xs mb-4 hover:text-white"
            >
              <ArrowLeft size={12} /> Back to booking page
            </NextLink>
            <span className="text-[10px] font-black tracking-tight text-white/90 bg-white/20 px-2 py-0.5 rounded-full uppercase">
              Dashboard
            </span>
            <h1 className="text-2xl font-black text-white leading-tight mt-2">{business.name}</h1>
          </div>
        </div>

        {/* Tab navigation (sticky just below the header) */}
        <div className="sticky top-[57px] z-20 bg-stone-50 border-b border-stone-100 -mt-1">
          <div className="px-2 py-2 flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t.key
              const badge = t.key === 'bookings' && pendingBookingCount > 0
                ? pendingBookingCount
                : t.key === 'creators' && creatorActionCount > 0
                ? creatorActionCount
                : null
              return (
                <NextLink
                  key={t.key}
                  href={`/dashboard/business/${business.slug}?tab=${t.key}`}
                  scroll={false}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {badge !== null && (
                    <span className={`text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 ${
                      active ? 'bg-white text-stone-900' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {badge}
                    </span>
                  )}
                </NextLink>
              )
            })}
          </div>
        </div>

        {/* Stripe Connect prompt — show only on overview */}
        {tab === 'overview' && !stripeConnected && (
          <div className="px-4 mt-4">
            <div className="bg-stone-900 text-white rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Set up payments</p>
                  <p className="text-stone-300 text-xs mt-0.5">Connect Stripe to accept card payments.</p>
                </div>
                <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase flex-shrink-0">Required</span>
              </div>
              <button
                onClick={connectStripe}
                disabled={connecting}
                className="w-full py-2.5 rounded-xl bg-white text-stone-900 text-sm font-semibold hover:bg-stone-100 disabled:opacity-50"
              >
                {connecting ? 'Opening Stripe…' : 'Connect with Stripe'}
              </button>
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="px-4 mt-6">
          {tab === 'overview' && (
            <OverviewTab
              data={data}
              todayAgenda={todayAgenda}
              pendingRequestsCount={pendingRequests.length}
              staff={staff}
              businessSlug={business.slug}
            />
          )}

          {tab === 'calendar' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-stone-400 uppercase tracking-widest">Schedule</span>
                <div className="flex items-center gap-2">
                  <NextLink
                    href={`/dashboard/business/${business.slug}/staff`}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800"
                  >
                    Staff
                  </NextLink>
                  <button
                    onClick={() => setShowWalkin(true)}
                    disabled={services.length === 0}
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1.5 rounded-lg disabled:opacity-30"
                  >
                    <Plus size={12} /> Walk-in
                  </button>
                </div>
              </div>

              {/* View switcher */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl mb-3">
                {(['day', 'week', 'month'] as ScheduleView[]).map((v) => (
                  <NextLink
                    key={v}
                    href={`/dashboard/business/${business.slug}?tab=calendar&view=${v}&date=${viewDate}`}
                    scroll={false}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      view === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {v}
                  </NextLink>
                ))}
              </div>

              {view === 'day' && (
                <DailyAgenda agenda={agenda} date={viewDate} businessSlug={business.slug} staff={staff} />
              )}
              {view === 'week' && (
                <WeeklyAgenda bookings={rangeBookings} weekStart={viewDate} businessSlug={business.slug} />
              )}
              {view === 'month' && (
                <MonthlyAgenda bookings={rangeBookings} monthStart={viewDate} businessSlug={business.slug} />
              )}
            </>
          )}

          {tab === 'bookings' && (
            <BookingsTab
              bookings={bookingsList}
              status={bookingsStatus}
              staff={staff}
              businessSlug={business.slug}
            />
          )}

          {tab === 'creators' && (
            <CreatorsTab
              pendingRequests={pendingRequests}
              myCreators={myCreators}
              creatorRollups={data.creatorRollups}
            />
          )}
        </div>

        {showWalkin && (
          <WalkinModal
            businessSlug={business.slug}
            services={services}
            staff={staff}
            date={tab === 'calendar' && view === 'day' ? viewDate : new Date().toISOString().split('T')[0]}
            onClose={() => setShowWalkin(false)}
          />
        )}
      </div>
    </div>
  )
}
