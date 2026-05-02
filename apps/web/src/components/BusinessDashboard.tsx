'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Wallet,
  Users,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Music,
  Instagram,
  Youtube,
  Twitter,
  Globe,
} from 'lucide-react'
import type {
  BusinessDashboardData,
  BookingWithCreator,
  CreatorRollup,
  SocialPlatform,
} from '@/lib/types'
import type { PendingLinkRequest, MyCreatorEntry } from '@/lib/db'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatPrice(thb: number) {
  return `฿${thb.toLocaleString()}`
}

function formatBookingDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return diffMin <= 1 ? 'just now' : `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return `${Math.floor(diffDay / 7)}w ago`
}

// ── Platform icon ────────────────────────────────────────────────────────────

function PlatformIcon({ platform, size = 12 }: { platform: SocialPlatform; size?: number }) {
  switch (platform) {
    case 'tiktok': return <Music size={size} />
    case 'instagram': return <Instagram size={size} />
    case 'youtube': return <Youtube size={size} />
    case 'x': return <Twitter size={size} />
    default: return <Globe size={size} />
  }
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, hint }: {
  label: string; value: string; icon: React.ReactNode; hint?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-stone-400 mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black text-stone-900 leading-none">{value}</p>
      {hint && <p className="text-xs text-stone-400 mt-1.5">{hint}</p>}
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: BookingWithCreator['status'] }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-green-50 text-green-700',
    pending: 'bg-amber-50 text-amber-700',
    declined: 'bg-stone-100 text-stone-500',
    cancelled: 'bg-stone-100 text-stone-500',
  }
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  )
}

// ── Booking row (with accept/decline for pending) ────────────────────────────

function BookingRow({
  booking,
  onUpdate,
}: {
  booking: BookingWithCreator
  onUpdate: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function setStatus(status: 'confirmed' | 'declined') {
    setBusy(true)
    try {
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      onUpdate()
    } finally {
      setBusy(false)
    }
  }

  const isPending = booking.status === 'pending'

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-stone-900 text-sm truncate">{booking.serviceName}</h3>
            <StatusPill status={booking.status} />
          </div>
          <p className="text-stone-500 text-xs">{booking.customerName}</p>
        </div>
        <span className="font-bold text-stone-900 text-base flex-shrink-0">
          {formatPrice(booking.price)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-stone-400">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {formatBookingDate(booking.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {booking.time}
          </span>
        </div>
        {booking.creator ? (
          <span className="flex items-center gap-1 text-rose-600 font-semibold">
            via {booking.creator.handle}
          </span>
        ) : (
          <span className="text-stone-400">Direct</span>
        )}
      </div>

      <p className="text-[10px] text-stone-300 mt-2">Booked {relativeTime(booking.createdAt)}</p>

      {/* Accept / decline */}
      {isPending && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setStatus('declined')}
            disabled={busy}
            className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 active:scale-[0.97] disabled:opacity-50 transition-all flex items-center justify-center gap-1"
          >
            <X size={13} /> Decline
          </button>
          <button
            onClick={() => setStatus('confirmed')}
            disabled={busy}
            className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 active:scale-[0.97] disabled:opacity-50 transition-all flex items-center justify-center gap-1"
          >
            <Check size={13} /> Accept
          </button>
        </div>
      )}
    </div>
  )
}

// ── Pending link request card ─────────────────────────────────────────────────

function PendingRequestCard({
  request,
  onUpdate,
}: {
  request: PendingLinkRequest
  onUpdate: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function decide(status: 'active' | 'declined') {
    setBusy(true)
    try {
      await fetch(`/api/links/${request.link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      onUpdate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{ backgroundColor: request.creator.avatarColor }}
        >
          {request.creator.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-stone-900 text-sm truncate">
              {request.creator.handle}
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Pending
            </span>
          </div>
          <p className="text-stone-500 text-xs leading-relaxed mt-0.5 line-clamp-2">
            {request.creator.bio}
          </p>
        </div>
      </div>

      {/* Content URL preview */}
      {request.link.contentUrl && (
        <a
          href={request.link.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mb-3 px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-600 hover:border-rose-300 transition-colors"
        >
          {request.link.platform && <PlatformIcon platform={request.link.platform} />}
          <span className="font-mono truncate flex-1">{request.link.contentUrl}</span>
          <ExternalLink size={11} className="text-stone-400 flex-shrink-0" />
        </a>
      )}

      <div className="flex items-center justify-between mb-3 text-xs">
        <Link
          href={`/${request.creator.slug}`}
          className="text-rose-600 font-semibold hover:underline"
        >
          View profile →
        </Link>
        <span className="text-stone-400">Requested {relativeTime(new Date().toISOString())}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => decide('declined')}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 active:scale-[0.97] disabled:opacity-50 transition-all flex items-center justify-center gap-1"
        >
          <X size={14} /> Decline
        </button>
        <button
          onClick={() => decide('active')}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 active:scale-[0.97] disabled:opacity-50 transition-all flex items-center justify-center gap-1"
        >
          <Check size={14} /> Accept
        </button>
      </div>
    </div>
  )
}

// ── My creator card ───────────────────────────────────────────────────────────

function MyCreatorCard({ entry }: { entry: MyCreatorEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left active:bg-stone-50 transition-colors"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{ backgroundColor: entry.creator.avatarColor }}
        >
          {entry.creator.avatarInitials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-900 text-sm truncate">
            {entry.creator.handle}
          </p>
          <p className="text-stone-400 text-xs truncate">{entry.creator.displayName}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
            <span>{entry.bookingCount} booking{entry.bookingCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatPrice(entry.revenue)} driven</span>
          </div>
        </div>

        {/* Platform icons */}
        <div className="flex items-center gap-1 text-stone-400 flex-shrink-0">
          {entry.creator.socials.slice(0, 3).map((s) => (
            <PlatformIcon key={s.platform + s.url} platform={s.platform} />
          ))}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-stone-100 p-4 bg-stone-50/50 space-y-3">
          {entry.creator.bio && (
            <p className="text-stone-600 text-sm leading-relaxed">{entry.creator.bio}</p>
          )}

          {/* Content URL */}
          {entry.link.contentUrl && (
            <a
              href={entry.link.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-600 hover:border-rose-300 transition-colors"
            >
              {entry.link.platform && <PlatformIcon platform={entry.link.platform} />}
              <span className="font-mono truncate flex-1">View their content</span>
              <ExternalLink size={11} className="text-stone-400 flex-shrink-0" />
            </a>
          )}

          {/* Socials */}
          {entry.creator.socials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.creator.socials.map((s) => (
                <a
                  key={s.platform + s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-white border border-stone-200 hover:border-rose-300 px-2.5 py-1.5 rounded-full text-xs font-medium text-stone-600"
                >
                  <PlatformIcon platform={s.platform} />
                  {s.platform === 'x' ? 'X' : s.platform.charAt(0).toUpperCase() + s.platform.slice(1)}
                </a>
              ))}
            </div>
          )}

          <Link
            href={`/${entry.creator.slug}`}
            className="block text-center w-full py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-white"
          >
            View full profile →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Creator rollup row ────────────────────────────────────────────────────────

function CreatorRollupRow({ rollup }: { rollup: CreatorRollup }) {
  return (
    <Link
      href={`/dashboard/creator/${rollup.slug}`}
      className="flex items-center justify-between bg-white rounded-2xl border border-stone-100 p-4 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-900 text-sm">{rollup.handle}</p>
        <p className="text-stone-400 text-xs mt-0.5">
          {rollup.bookingCount} booking{rollup.bookingCount !== 1 ? 's' : ''} · {formatPrice(rollup.revenue)} driven
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-stone-400 text-[10px] uppercase tracking-wide">Paid out</p>
          <p className="text-rose-600 font-bold text-sm">{formatPrice(rollup.earnings)}</p>
        </div>
        <ChevronRight size={16} className="text-stone-300 group-hover:text-rose-600 transition-colors" />
      </div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BusinessDashboard({
  data,
  pendingRequests,
  myCreators,
  stripeConnected,
}: {
  data: BusinessDashboardData
  pendingRequests: PendingLinkRequest[]
  myCreators: MyCreatorEntry[]
  stripeConnected: boolean
}) {
  const { business, bookings, stats, creatorRollups } = data
  const [from, to] = business.coverGradient
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)

  function refresh() {
    router.refresh()
  }

  async function connectStripe() {
    setConnecting(true)
    try {
      const res = await fetch(`/api/businesses/${business.slug}/connect-stripe`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      window.location.href = data.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start Stripe onboarding')
      setConnecting(false)
    }
  }

  const pendingBookingCount = bookings.filter((b) => b.status === 'pending').length

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
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            />
          )}
          <div className="relative px-5 pt-8 pb-12">
            <Link
              href={`/glowwithsara/${business.slug}`}
              className="flex items-center gap-1 text-white/80 text-xs mb-4 hover:text-white"
            >
              <ArrowLeft size={12} /> Back to booking page
            </Link>
            <span className="text-[10px] font-black tracking-tight text-white/90 bg-white/20 px-2 py-0.5 rounded-full uppercase">
              Dashboard
            </span>
            <h1 className="text-2xl font-black text-white leading-tight mt-2">{business.name}</h1>
            <p className="text-white/70 text-xs mt-1">Last updated just now</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="px-4 -mt-7 relative z-10">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Bookings" value={String(stats.totalBookings)} icon={<TrendingUp size={14} />} />
            <KpiCard label="Revenue" value={formatPrice(stats.totalRevenue)} icon={<Wallet size={14} />} hint="Gross" />
            <KpiCard label="Paid to creators" value={formatPrice(stats.totalCreatorEarnings)} icon={<Users size={14} />} hint="10% commission" />
            <KpiCard label="Platform fees" value={formatPrice(stats.totalPlatformFees)} icon={<Wallet size={14} />} hint="5% to BRIDGE" />
          </div>
        </div>

        {/* Stripe Connect prompt */}
        {!stripeConnected && (
          <div className="px-4 mt-4">
            <div className="bg-stone-900 text-white rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Set up payments</p>
                  <p className="text-stone-300 text-xs mt-0.5">
                    Connect your Stripe account to accept card payments. Bookings will require payment after this is set up.
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase flex-shrink-0">
                  Required
                </span>
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

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="px-4 mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-widest">
                Pending Requests
              </h2>
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                {pendingRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((r) => (
                <PendingRequestCard key={r.link.id} request={r} onUpdate={refresh} />
              ))}
            </div>
          </div>
        )}

        {/* My creators (friends list) */}
        {myCreators.length > 0 && (
          <div className="px-4 mt-8">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-3">
              My Creators
            </h2>
            <div className="space-y-3">
              {myCreators.map((e) => (
                <MyCreatorCard key={e.creator.id} entry={e} />
              ))}
            </div>
          </div>
        )}

        {/* Top creators (by attribution) */}
        {creatorRollups.length > 0 && (
          <div className="px-4 mt-8">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-3">
              Top Creators
            </h2>
            <div className="space-y-2">
              {creatorRollups.map((c) => (
                <CreatorRollupRow key={c.slug} rollup={c} />
              ))}
            </div>
          </div>
        )}

        {/* Recent bookings */}
        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest">
              Recent Bookings
            </h2>
            {pendingBookingCount > 0 && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                {pendingBookingCount} pending
              </span>
            )}
          </div>
          {bookings.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">
              No bookings yet. Share your link to start.
            </p>
          ) : (
            <div className="space-y-2">
              {bookings.slice(0, 10).map((b) => (
                <BookingRow key={b.id} booking={b} onUpdate={refresh} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
