'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MousePointerClick,
  CalendarCheck,
  Wallet,
  ArrowLeft,
  Copy,
  TrendingUp,
  Plus,
  ExternalLink,
  Music,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import type {
  CreatorDashboardData,
  ActivityEvent,
  LinkPerformance,
  SocialPlatform,
} from '@/lib/types'
import AddPlaceModal from './AddPlaceModal'

function formatPrice(thb: number) {
  return `฿${thb.toLocaleString()}`
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
    <div className="bg-white rounded-2xl border border-bridge-border/60 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-bridge-muted mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-bridge-heading leading-none">{value}</p>
      {hint && <p className="text-xs text-bridge-muted mt-1.5">{hint}</p>}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function LinkStatusBadge({ status }: { status: LinkPerformance['status'] }) {
  const styles: Record<LinkPerformance['status'], string> = {
    active: 'bg-green-50 text-green-700',
    pending: 'bg-amber-50 text-amber-700',
    declined: 'bg-bridge-surface text-bridge-muted',
  }
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  )
}

// ── Link performance card ────────────────────────────────────────────────────

function LinkPerformanceCard({ link, creatorSlug }: { link: LinkPerformance; creatorSlug: string }) {
  const [from, to] = link.business.coverGradient
  const linkUrl = `bridge.to/${creatorSlug}/${link.business.slug}`
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(linkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const conv = link.clicks > 0 ? (link.bookings / link.clicks) * 100 : 0
  const isActive = link.status === 'active'

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${
      isActive ? 'border-bridge-border/60' : 'border-bridge-border opacity-90'
    }`}>
      {/* Header bar */}
      <div className="h-2" style={{
        background: link.business.coverPhotoUrl
          ? `url(${link.business.coverPhotoUrl}) center/cover`
          : `linear-gradient(90deg, ${from}, ${to})`,
      }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <Link
                href={`/${creatorSlug}/${link.business.slug}`}
                className="font-semibold text-bridge-heading text-sm hover:text-bridge-accent truncate"
              >
                {link.business.name}
              </Link>
              <LinkStatusBadge status={link.status} />
            </div>
            <p className="font-mono text-bridge-muted text-xs truncate">{linkUrl}</p>
          </div>
          {isActive && (
            <button
              onClick={copy}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-bridge-accent bg-bridge-accent-wash px-2.5 py-1.5 rounded-lg hover:bg-bridge-accent-wash transition-colors"
            >
              <Copy size={11} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>

        {/* Content URL */}
        {link.contentUrl && (
          <a
            href={link.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mb-3 px-2.5 py-1.5 bg-bridge-bg border border-bridge-border rounded-lg text-xs text-bridge-secondary hover:border-bridge-accent-light transition-colors"
          >
            {link.platform && <PlatformIcon platform={link.platform} />}
            <span className="font-mono truncate flex-1">{link.contentUrl}</span>
            <ExternalLink size={10} className="text-bridge-muted flex-shrink-0" />
          </a>
        )}

        {/* Stats row — only for active links */}
        {isActive ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-bridge-bg rounded-xl py-2">
                <p className="text-bridge-heading font-bold text-sm">{link.clicks.toLocaleString()}</p>
                <p className="text-bridge-muted text-[10px] uppercase tracking-wide mt-0.5">Clicks</p>
              </div>
              <div className="bg-bridge-bg rounded-xl py-2">
                <p className="text-bridge-heading font-bold text-sm">{link.bookings}</p>
                <p className="text-bridge-muted text-[10px] uppercase tracking-wide mt-0.5">Bookings</p>
              </div>
              <div className="bg-bridge-accent-wash rounded-xl py-2">
                <p className="text-bridge-accent font-bold text-sm">{formatPrice(link.earnings)}</p>
                <p className="text-bridge-accent text-[10px] uppercase tracking-wide mt-0.5">Earned</p>
              </div>
            </div>

            {link.clicks > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1 text-xs text-bridge-muted">
                <TrendingUp size={11} />
                <span>{conv.toFixed(1)}% conversion</span>
              </div>
            )}

            {link.customersAcquired > 0 && (
              <div className="mt-2 text-center text-[11px] text-purple-600 font-medium">
                Acquired {link.customersAcquired} customer{link.customersAcquired !== 1 ? 's' : ''}
                {link.customersRebooked > 0 && (
                  <> · <span className="font-bold">{link.customersRebooked}</span> rebooked</>
                )}
              </div>
            )}
          </>
        ) : link.status === 'pending' ? (
          <p className="text-xs text-bridge-muted text-center py-3 bg-amber-50/50 rounded-xl">
            Waiting for {link.business.name} to accept. Tracking starts then.
          </p>
        ) : (
          <p className="text-xs text-bridge-muted text-center py-3 bg-bridge-bg rounded-xl">
            This business declined the request.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ event }: { event: ActivityEvent }) {
  const isBooking = event.type === 'booking'
  return (
    <div className="flex items-center gap-3 py-3 border-b border-bridge-border/60 last:border-b-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        isBooking ? 'bg-bridge-accent-wash text-bridge-accent' : 'bg-bridge-surface text-bridge-muted'
      }`}>
        {isBooking ? <CalendarCheck size={15} /> : <MousePointerClick size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-bridge-heading truncate">{event.label}</p>
        <p className="text-xs text-bridge-muted">{relativeTime(event.createdAt)}</p>
      </div>
      {isBooking && event.amount !== undefined && (
        <span className="text-bridge-accent font-bold text-sm flex-shrink-0">
          +{formatPrice(event.amount)}
        </span>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CreatorDashboard({ data }: { data: CreatorDashboardData }) {
  const { creator, totals, links, recentActivity } = data
  const router = useRouter()
  const [showAddPlace, setShowAddPlace] = useState(false)

  const pendingCount = links.filter((l) => l.status === 'pending').length

  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="px-5 pt-8 pb-12 bg-bridge-heading text-white">
          <Link
            href={`/${creator.slug}`}
            className="flex items-center gap-1 text-white/60 text-xs mb-4 hover:text-white"
          >
            <ArrowLeft size={12} /> Back to profile
          </Link>

          <span className="text-[10px] font-bold tracking-tight text-white/80 bg-white/10 px-2 py-0.5 rounded-full uppercase">
            Dashboard
          </span>

          <div className="flex items-center gap-3 mt-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ backgroundColor: creator.avatarColor }}
            >
              {creator.avatarInitials}
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">{creator.displayName}</h1>
              <p className="text-bridge-accent-light text-sm font-semibold">{creator.handle}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="px-4 -mt-7 relative z-10">
          <div className="grid grid-cols-3 gap-2">
            <KpiCard label="Clicks" value={totals.totalClicks.toLocaleString()} icon={<MousePointerClick size={13} />} />
            <KpiCard label="Bookings" value={String(totals.totalBookings)} icon={<CalendarCheck size={13} />} />
            <KpiCard label="Earned" value={formatPrice(totals.totalEarnings)} icon={<Wallet size={13} />} />
          </div>

          {totals.pendingPayout > 0 && (
            <div className="mt-3 bg-bridge-accent rounded-2xl p-4 text-white flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-bridge-accent-light">
                  Pending payout
                </p>
                <p className="text-2xl font-bold mt-1">{formatPrice(totals.pendingPayout)}</p>
              </div>
              <p className="text-xs text-bridge-accent-light max-w-[140px] text-right">
                Paid out monthly. Next: 1st of next month.
              </p>
            </div>
          )}

          {/* Earnings split */}
          {(totals.firstBookingEarnings > 0 || totals.repeatEarnings > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl border border-bridge-border/60 p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-wide font-bold text-bridge-muted">First bookings</p>
                <p className="text-lg font-bold text-bridge-heading mt-1 leading-none">
                  {formatPrice(totals.firstBookingEarnings)}
                </p>
                <p className="text-[10px] text-bridge-muted mt-1">10% rate</p>
              </div>
              <div className="bg-white rounded-2xl border border-purple-200 bg-purple-50/30 p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-wide font-bold text-purple-700">Repeat earnings</p>
                <p className="text-lg font-bold text-purple-900 mt-1 leading-none">
                  {formatPrice(totals.repeatEarnings)}
                </p>
                <p className="text-[10px] text-purple-600 mt-1">5% residual</p>
              </div>
            </div>
          )}

          {/* Customer acquisition stats */}
          {totals.customersAcquired > 0 && (
            <div className="mt-3 bg-white rounded-2xl border border-bridge-border/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-bridge-accent" />
                <span className="text-xs font-semibold uppercase tracking-wide text-bridge-muted">
                  Customers you acquired
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-bridge-heading leading-none">{totals.customersAcquired}</p>
                  <p className="text-[10px] text-bridge-muted mt-1">Total</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-bridge-heading leading-none">{totals.customersInWindow}</p>
                  <p className="text-[10px] text-bridge-muted mt-1">In window</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-bridge-heading leading-none">{formatPrice(totals.lifetimeValue)}</p>
                  <p className="text-[10px] text-bridge-muted mt-1">Spent</p>
                </div>
              </div>
              <p className="text-[10px] text-bridge-muted mt-2 text-center">
                Repeat bookings within 6 months earn you 5% residual.
              </p>
            </div>
          )}
        </div>

        {/* Add a new place */}
        <div className="px-4 mt-6">
          <button
            onClick={() => setShowAddPlace(true)}
            className="w-full py-4 rounded-2xl bg-bridge-accent text-white font-semibold text-base hover:bg-bridge-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Add a new place
          </button>
        </div>

        {/* Your links */}
        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-bridge-muted uppercase tracking-widest">
              Your Links
            </h2>
            {pendingCount > 0 && (
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                {pendingCount} pending
              </span>
            )}
          </div>

          {links.length === 0 ? (
            <div className="bg-white rounded-2xl border border-bridge-border/60 p-6 text-center">
              <p className="text-bridge-muted text-sm mb-3">No links yet.</p>
              <button
                onClick={() => setShowAddPlace(true)}
                className="text-bridge-accent font-semibold text-sm hover:underline"
              >
                Add your first place →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((l) => (
                <LinkPerformanceCard key={l.linkId} link={l} creatorSlug={creator.slug} />
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="px-4 mt-8">
          <h2 className="text-sm font-semibold text-bridge-muted uppercase tracking-widest mb-3">
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-bridge-muted text-sm text-center py-8">
              Nothing yet. Activity shows up here as people click and book.
            </p>
          ) : (
            <div className="bg-white rounded-2xl border border-bridge-border/60 px-4 shadow-sm">
              {recentActivity.map((e) => (
                <ActivityRow key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add place modal */}
      {showAddPlace && (
        <AddPlaceModal
          creatorSlug={creator.slug}
          onClose={() => setShowAddPlace(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  )
}
