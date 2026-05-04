'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, X, ExternalLink, ChevronRight, Music, Instagram, Youtube, Twitter, Globe, Inbox,
} from 'lucide-react'
import type { CreatorRollup, SocialPlatform } from '@/lib/types'
import type { PendingLinkRequest, MyCreatorEntry } from '@/lib/db'

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }

function PlatformIcon({ platform, size = 12 }: { platform: SocialPlatform; size?: number }) {
  switch (platform) {
    case 'tiktok': return <Music size={size} />
    case 'instagram': return <Instagram size={size} />
    case 'youtube': return <Youtube size={size} />
    case 'x': return <Twitter size={size} />
    default: return <Globe size={size} />
  }
}

function platformLabel(p: SocialPlatform) {
  return p === 'x' ? 'X' : p.charAt(0).toUpperCase() + p.slice(1)
}

interface Props {
  pendingRequests: PendingLinkRequest[]
  myCreators: MyCreatorEntry[]
  creatorRollups: CreatorRollup[]
}

export default function CreatorsTab({ pendingRequests, myCreators, creatorRollups }: Props) {
  if (pendingRequests.length === 0 && myCreators.length === 0 && creatorRollups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-50 mb-3">
          <Inbox size={20} className="text-stone-400" />
        </div>
        <p className="text-stone-500 text-sm">No creator activity yet.</p>
        <p className="text-stone-400 text-xs mt-1">When creators link to your business, they appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Section title="Pending Requests" tone="amber" badge={pendingRequests.length}>
          <div className="space-y-3">
            {pendingRequests.map((r) => (
              <PendingRequestCard key={r.link.id} request={r} />
            ))}
          </div>
        </Section>
      )}

      {/* My Creators */}
      {myCreators.length > 0 && (
        <Section title="My Creators" badge={myCreators.length}>
          <div className="space-y-3">
            {myCreators.map((e) => <MyCreatorCard key={e.creator.id} entry={e} />)}
          </div>
        </Section>
      )}

      {/* Top Creators by attribution */}
      {creatorRollups.length > 0 && (
        <Section title="Top Creators by Bookings">
          <div className="space-y-2">
            {creatorRollups.map((c) => <RollupRow key={c.slug} rollup={c} />)}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({
  title, tone, badge, children,
}: {
  title: string
  tone?: 'amber'
  badge?: number
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-semibold uppercase tracking-widest ${
          tone === 'amber' ? 'text-amber-700' : 'text-stone-400'
        }`}>{title}</h2>
        {badge !== undefined && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
            tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
          }`}>{badge}</span>
        )}
      </div>
      {children}
    </section>
  )
}

function PendingRequestCard({ request }: { request: PendingLinkRequest }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function decide(status: 'active' | 'declined') {
    setBusy(true)
    try {
      await fetch(`/api/links/${request.link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-amber-50/30 rounded-2xl border border-amber-200 p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{ backgroundColor: request.creator.avatarColor }}
        >
          {request.creator.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-stone-900 text-sm truncate">{request.creator.handle}</p>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pending</span>
          </div>
          <p className="text-stone-500 text-xs leading-relaxed mt-0.5 line-clamp-2">{request.creator.bio}</p>
        </div>
      </div>

      {request.link.contentUrl && (
        <a
          href={request.link.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mb-3 px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-600 hover:border-rose-300"
        >
          {request.link.platform && <PlatformIcon platform={request.link.platform} />}
          <span className="font-mono truncate flex-1">{request.link.contentUrl}</span>
          <ExternalLink size={11} className="text-stone-400 flex-shrink-0" />
        </a>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => decide('declined')}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <X size={14} /> Decline
        </button>
        <button
          onClick={() => decide('active')}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Check size={14} /> Accept
        </button>
      </div>
    </div>
  )
}

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
          <p className="font-semibold text-stone-900 text-sm truncate">{entry.creator.handle}</p>
          <p className="text-stone-400 text-xs truncate">{entry.creator.displayName}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
            <span>{entry.bookingCount} booking{entry.bookingCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatPrice(entry.revenue)} driven</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-stone-400 flex-shrink-0">
          {entry.creator.socials.slice(0, 3).map((s) => (
            <PlatformIcon key={s.platform + s.url} platform={s.platform} />
          ))}
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100 p-4 bg-stone-50/50 space-y-3">
          {entry.creator.bio && <p className="text-stone-600 text-sm leading-relaxed">{entry.creator.bio}</p>}
          {entry.link.contentUrl && (
            <a
              href={entry.link.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-600 hover:border-rose-300"
            >
              {entry.link.platform && <PlatformIcon platform={entry.link.platform} />}
              <span className="font-mono truncate flex-1">View their content</span>
              <ExternalLink size={11} className="text-stone-400 flex-shrink-0" />
            </a>
          )}
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
                  {platformLabel(s.platform)}
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

function RollupRow({ rollup }: { rollup: CreatorRollup }) {
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
