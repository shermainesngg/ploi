'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import NextLink from 'next/link'
import dynamic from 'next/dynamic'
import { Eye, Wallet, LayoutGrid, Calendar, Inbox, Users, Plus, Settings, MapPin, RefreshCw, Check, X } from 'lucide-react'
import type { BusinessDashboardData, ContentWithCreator } from '@/lib/types'
import type { PendingLinkRequest, MyCreatorEntry } from '@/services/link.service'
import type { AgendaBooking } from '@/services/dashboard.service'
import { agendaToScheduleXEvents } from '@/lib/calendar-events'
import DailyAgenda from './DailyAgenda'
import WeeklyAgenda from './WeeklyAgenda'
import MonthlyAgenda from './MonthlyAgenda'
import BookingActionCard from './BookingActionCard'
import WalkinModal from './WalkinModal'

// Schedule-X is desktop-only and heavy — load it on demand, client-side only.
const PloiCalendar = dynamic(() => import('./PloiCalendar'), { ssr: false })
import OverviewTab from './dashboard/OverviewTab'
import BookingsTab from './dashboard/BookingsTab'
import CreatorsTab from './dashboard/CreatorsTab'
import SettingsTab from './dashboard/SettingsTab'
import LocationsTab from './dashboard/LocationsTab'

type Tab = 'overview' | 'calendar' | 'bookings' | 'creators' | 'locations' | 'settings'
type ScheduleView = 'day' | 'week' | 'month'

interface Props {
  tab: Tab
  data: BusinessDashboardData
  pendingRequests: PendingLinkRequest[]
  myCreators: MyCreatorEntry[]
  pendingContent: ContentWithCreator[]
  activeContent: ContentWithCreator[]
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

/** Compact "synced 5m ago" relative label. */
function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { key: 'calendar', label: 'Calendar', icon: <Calendar size={14} /> },
  { key: 'bookings', label: 'Bookings', icon: <Inbox size={14} /> },
  { key: 'creators', label: 'Creators', icon: <Users size={14} /> },
  { key: 'locations', label: 'Locations', icon: <MapPin size={14} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={14} /> },
]

export default function BusinessDashboard(props: Props) {
  const {
    tab, data, pendingRequests, myCreators, pendingContent, activeContent, stripeConnected,
    view, viewDate, agenda, rangeBookings, todayAgenda,
    bookingsList, bookingsStatus, services, staff,
  } = props
  const { business } = data
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [showWalkin, setShowWalkin] = useState(false)
  const [resyncing, setResyncing] = useState(false)
  const [gcalMsg, setGcalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // Desktop Schedule-X grid: empty-slot click seeds a walk-in; event click opens details.
  const [walkinSlot, setWalkinSlot] = useState<{ date: string; time: string } | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // The grid is fed by whatever the server loaded for the current view; merge the
  // day + range + today sets (deduped) so it has the widest coverage available.
  const calendarBookings = useMemo(() => {
    const byId = new Map<string, AgendaBooking>()
    for (const b of [...rangeBookings, ...agenda, ...todayAgenda]) byId.set(b.id, b)
    return Array.from(byId.values())
  }, [rangeBookings, agenda, todayAgenda])
  const sxEvents = useMemo(() => agendaToScheduleXEvents(calendarBookings), [calendarBookings])
  const selectedBooking = selectedEventId
    ? calendarBookings.find((b) => b.id === selectedEventId) ?? null
    : null

  function openWalkin(slot: { date: string; time: string } | null) {
    setWalkinSlot(slot)
    setShowWalkin(true)
  }

  // Surface the OAuth return state (?gcal=connected|error) as a one-time banner.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const g = p.get('gcal')
    if (g === 'connected') {
      setGcalMsg({ type: 'success', text: 'Google Calendar connected. Confirmed bookings now sync automatically.' })
    } else if (g === 'error') {
      const reason = p.get('reason')
      setGcalMsg({
        type: 'error',
        text: reason === 'no_refresh_token'
          ? 'Google didn’t return access. Please try connecting again.'
          : 'Couldn’t connect Google Calendar. Please try again.',
      })
    }
  }, [])

  async function resyncGoogle() {
    setResyncing(true)
    try {
      const res = await fetch(`/api/businesses/${business.slug}/google-calendar/resync`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Re-sync failed')
      setGcalMsg({
        type: 'success',
        text: `Re-synced ${d.resynced} booking${d.resynced === 1 ? '' : 's'}${d.failed ? ` · ${d.failed} still failing` : ''}.`,
      })
    } catch (err) {
      setGcalMsg({ type: 'error', text: err instanceof Error ? err.message : 'Re-sync failed' })
    } finally {
      setResyncing(false)
    }
  }

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

  const pendingBookingCount = data.bookings.filter((b) => b.status === 'pending').length
  const creatorActionCount = pendingRequests.length + pendingContent.length

  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto pb-24">
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
              href={`/shop/${business.slug}`}
              className="flex items-center gap-1 text-white/80 text-xs mb-4 hover:text-white transition-colors"
            >
              <Eye size={12} /> View your listing
            </NextLink>
            <span className="text-micro font-bold tracking-wide text-white/90 bg-white/20 px-2 py-0.5 rounded-full uppercase">
              Dashboard
            </span>
            <h1 className="font-display text-2xl font-bold text-white leading-tight mt-2">{business.name}</h1>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="sticky top-[57px] z-20 bg-bridge-bg border-b border-bridge-border/60 -mt-1">
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
                  href={`?tab=${t.key}`}
                  scroll={false}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-micro font-semibold border transition-colors ${
                    active ? 'bg-bridge-ink text-bridge-ink-foreground border-bridge-ink' : 'bg-bridge-card border-bridge-border text-bridge-secondary hover:border-bridge-border-strong'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {badge !== null && (
                    <span className="text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 bg-bridge-accent text-white">
                      {badge}
                    </span>
                  )}
                </NextLink>
              )
            })}
          </div>
        </div>

        {/* Stripe Connect prompt */}
        {tab === 'overview' && !stripeConnected && (
          <div className="px-4 mt-4">
            <div className="bg-bridge-ink-static text-white rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Set up payments</p>
                  <p className="text-bridge-border text-xs mt-0.5">Connect Stripe to accept card payments.</p>
                </div>
                <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase flex-shrink-0">Required</span>
              </div>
              <button
                onClick={connectStripe}
                disabled={connecting}
                className="w-full py-2.5 rounded-xl bg-bridge-card text-bridge-heading text-sm font-semibold hover:bg-bridge-surface disabled:opacity-50 transition-colors"
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
              pendingBookingCount={pendingBookingCount}
              creatorActionCount={creatorActionCount}
              staff={staff}
              businessSlug={business.slug}
            />
          )}

          {tab === 'calendar' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-label text-bridge-muted uppercase tracking-widest">Schedule</span>
                <div className="flex items-center gap-2">
                  <NextLink
                    href={`/dashboard/business/${business.slug}/staff`}
                    className="text-caption font-semibold text-bridge-muted hover:text-bridge-text transition-colors"
                  >
                    Staff
                  </NextLink>
                  <button
                    onClick={() => openWalkin(null)}
                    disabled={services.length === 0}
                    className="flex items-center gap-1 text-caption font-semibold text-white bg-bridge-accent hover:bg-bridge-accent-dark px-2.5 py-1.5 rounded-button disabled:opacity-30 transition-colors"
                  >
                    <Plus size={12} /> Walk-in
                  </button>
                </div>
              </div>

              {/* Google Calendar connection */}
              <div className="mb-3">
                {data.googleCalendarConnected ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bridge-surface border border-bridge-border/60">
                    <span className="flex items-center gap-1.5 text-caption text-bridge-muted min-w-0">
                      <Check size={13} className="text-emerald-600 flex-shrink-0" />
                      <span className="truncate">
                        Google Calendar · synced{' '}
                        <span className="font-data">{relativeTime(data.googleLastSyncedAt) || 'recently'}</span>
                      </span>
                    </span>
                    <button
                      onClick={resyncGoogle}
                      disabled={resyncing}
                      className="flex items-center gap-1 text-caption font-semibold text-bridge-text hover:text-bridge-heading disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      <RefreshCw size={12} className={resyncing ? 'animate-spin' : ''} />
                      {resyncing ? 'Syncing…' : 'Re-sync'}
                    </button>
                  </div>
                ) : (
                  <a
                    href={`/api/businesses/${business.slug}/google-calendar/connect`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-bridge-border bg-bridge-card text-caption font-semibold text-bridge-heading hover:border-bridge-border-strong transition-colors"
                  >
                    <Calendar size={13} /> Connect Google Calendar
                  </a>
                )}
                {gcalMsg && (
                  <p
                    className={`mt-2 text-caption ${
                      gcalMsg.type === 'success' ? 'text-bridge-muted' : 'text-bridge-accent'
                    }`}
                  >
                    {gcalMsg.text}
                  </p>
                )}
              </div>

              {/* Mobile: keep the existing day/week/month agendas (no regression). */}
              <div className="md:hidden">
                <div className="flex items-center gap-1 bg-bridge-surface p-1 rounded-xl mb-3">
                  {(['day', 'week', 'month'] as ScheduleView[]).map((v) => (
                    <NextLink
                      key={v}
                      href={`?tab=calendar&view=${v}&date=${viewDate}`}
                      scroll={false}
                      className={`flex-1 text-center py-1.5 rounded-button text-caption font-semibold capitalize transition-colors ${
                        view === v ? 'bg-bridge-card text-bridge-heading shadow-card' : 'text-bridge-muted hover:text-bridge-text'
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
                  <WeeklyAgenda bookings={rangeBookings} weekStart={viewDate} />
                )}
                {view === 'month' && (
                  <MonthlyAgenda bookings={rangeBookings} monthStart={viewDate} />
                )}
              </div>

              {/* Desktop: the Schedule-X grid, broken out of the page's max-w-2xl. */}
              <div className="hidden md:block w-screen relative left-1/2 -translate-x-1/2 px-4 lg:px-8">
                <div className="mx-auto max-w-5xl h-[70vh]">
                  <PloiCalendar
                    events={sxEvents}
                    selectedDate={viewDate}
                    onEventClick={(id) => setSelectedEventId(id)}
                    onSlotClick={(dt) => {
                      const [d, t] = dt.split(' ')
                      openWalkin({ date: d, time: t })
                    }}
                  />
                </div>
              </div>
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
              pendingContent={pendingContent}
              activeContent={activeContent}
              businessId={business.id}
              services={services}
            />
          )}

          {tab === 'locations' && <LocationsTab business={business} />}

          {tab === 'settings' && <SettingsTab business={business} />}
        </div>

        {showWalkin && (
          <WalkinModal
            businessSlug={business.slug}
            services={services}
            staff={staff}
            date={tab === 'calendar' && view === 'day' ? viewDate : new Date().toISOString().split('T')[0]}
            initialDate={walkinSlot?.date}
            initialTime={walkinSlot?.time}
            onClose={() => { setShowWalkin(false); setWalkinSlot(null) }}
          />
        )}

        {/* Desktop event-click → booking details/actions (reuses BookingActionCard). */}
        {selectedBooking && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setSelectedEventId(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-[480px] pointer-events-auto animate-scale-in">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setSelectedEventId(null)}
                    className="w-8 h-8 rounded-full bg-bridge-card border border-bridge-border flex items-center justify-center"
                  >
                    <X size={16} className="text-bridge-secondary" />
                  </button>
                </div>
                <BookingActionCard
                  booking={selectedBooking}
                  staff={staff}
                  businessSlug={business.slug}
                  expanded
                  showDate
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
