'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, X, ExternalLink, ChevronRight, Music, Instagram, Youtube, Twitter, Globe, Inbox, EyeOff, Play,
} from 'lucide-react'
import type { CreatorRollup, SocialPlatform, ContentWithCreator } from '@/lib/types'
import type { PendingLinkRequest, MyCreatorEntry } from '@/services/link.service'
import { resolvePosterUrl } from '@/lib/poster'
import { moderateContent } from '@/actions/content.actions'

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
  pendingContent: ContentWithCreator[]
  businessId: string
}

export default function CreatorsTab({
  pendingRequests, myCreators, creatorRollups, pendingContent, businessId,
}: Props) {
  if (
    pendingRequests.length === 0 &&
    myCreators.length === 0 &&
    creatorRollups.length === 0 &&
    pendingContent.length === 0
  ) {
    return (
      <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bridge-surface mb-3">
          <Inbox size={20} className="text-bridge-muted" />
        </div>
        <p className="text-bridge-muted text-body">No creator activity yet.</p>
        <p className="text-bridge-muted/70 text-caption mt-1">When creators link to your business, they appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Content approval queue — per-video moderation (PRD §D6) */}
      {pendingContent.length > 0 && (
        <Section title="Content to Review" tone="amber" badge={pendingContent.length}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pendingContent.map((item) => (
              <ContentApprovalCard key={item.content.id} item={item} businessId={businessId} />
            ))}
          </div>
        </Section>
      )}

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
        <h2 className={`text-label uppercase tracking-widest ${
          tone === 'amber' ? 'text-amber-700' : 'text-bridge-muted'
        }`}>{title}</h2>
        {badge !== undefined && (
          <span className={`text-micro px-2 py-0.5 rounded-full uppercase ${
            tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-bridge-surface text-bridge-secondary'
          }`}>{badge}</span>
        )}
      </div>
      {children}
    </section>
  )
}

function ContentApprovalCard({ item, businessId }: { item: ContentWithCreator; businessId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const { content, creator } = item
  const poster = resolvePosterUrl(content.posterPath)

  async function decide(status: 'active' | 'hidden') {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('contentId', content.id)
      fd.set('businessId', businessId)
      fd.set('status', status)
      await moderateContent(fd)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 shadow-card overflow-hidden">
      <a
        href={content.contentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[9/16] bg-bridge-media-placeholder"
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={content.caption ?? ''} className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-overlay-scrim" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-bridge-heading">
            <Play size={16} className="ml-0.5 fill-current" />
          </span>
        </div>
        <span className="absolute left-1.5 top-1.5 rounded-badge bg-black/50 px-1.5 py-0.5 text-micro font-semibold text-white">
          {creator.handle}
        </span>
      </a>
      <div className="flex gap-1.5 p-2">
        <button
          onClick={() => decide('hidden')}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1 rounded-button border border-bridge-border py-1.5 text-caption text-bridge-secondary transition-colors hover:bg-bridge-surface disabled:opacity-50"
        >
          <EyeOff size={12} /> Hide
        </button>
        <button
          onClick={() => decide('active')}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1 rounded-button bg-bridge-accent py-1.5 text-caption text-white transition-colors hover:bg-bridge-accent-dark disabled:opacity-50"
        >
          <Check size={12} /> Approve
        </button>
      </div>
    </div>
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
    <div className="bg-amber-50/30 rounded-2xl border border-amber-200 p-4 shadow-card">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: request.creator.avatarColor }}
        >
          {request.creator.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-bridge-heading text-body truncate">{request.creator.handle}</p>
            <span className="text-micro font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pending</span>
          </div>
          <p className="text-bridge-muted text-caption leading-relaxed mt-0.5 line-clamp-2">{request.creator.bio}</p>
        </div>
      </div>

      {request.link.contentUrl && (
        <a
          href={request.link.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mb-3 px-3 py-2 bg-bridge-card border border-bridge-border rounded-button text-caption text-bridge-secondary hover:border-bridge-accent-light transition-colors"
        >
          {request.link.platform && <PlatformIcon platform={request.link.platform} />}
          <span className="font-mono truncate flex-1">{request.link.contentUrl}</span>
          <ExternalLink size={11} className="text-bridge-muted flex-shrink-0" />
        </a>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => decide('declined')}
          disabled={busy}
          className="flex-1 py-2.5 rounded-button border border-bridge-border text-bridge-secondary text-label hover:bg-bridge-surface disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
        >
          <X size={14} /> Decline
        </button>
        <button
          onClick={() => decide('active')}
          disabled={busy}
          className="flex-1 py-2.5 rounded-button bg-bridge-accent text-white text-label hover:bg-bridge-accent-dark disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
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
    <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left active:bg-bridge-surface transition-colors"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: entry.creator.avatarColor }}
        >
          {entry.creator.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-bridge-heading text-body truncate">{entry.creator.handle}</p>
          <p className="text-bridge-muted text-caption truncate">{entry.creator.displayName}</p>
          <div className="flex items-center gap-3 mt-1 text-micro text-bridge-muted">
            <span>{entry.bookingCount} booking{entry.bookingCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatPrice(entry.revenue)} driven</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-bridge-muted flex-shrink-0">
          {entry.creator.socials.slice(0, 3).map((s) => (
            <PlatformIcon key={s.platform + s.url} platform={s.platform} />
          ))}
        </div>
      </button>

      {open && (
        <div className="border-t border-bridge-border/40 p-4 bg-bridge-surface/50 space-y-3">
          {entry.creator.bio && <p className="text-bridge-secondary text-body leading-relaxed">{entry.creator.bio}</p>}
          {entry.link.contentUrl && (
            <a
              href={entry.link.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-bridge-card border border-bridge-border rounded-button text-caption text-bridge-secondary hover:border-bridge-accent-light transition-colors"
            >
              {entry.link.platform && <PlatformIcon platform={entry.link.platform} />}
              <span className="font-mono truncate flex-1">View their content</span>
              <ExternalLink size={11} className="text-bridge-muted flex-shrink-0" />
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
                  className="flex items-center gap-1.5 bg-bridge-card border border-bridge-border hover:border-bridge-accent-light px-2.5 py-1.5 rounded-full text-caption font-medium text-bridge-secondary transition-colors"
                >
                  <PlatformIcon platform={s.platform} />
                  {platformLabel(s.platform)}
                </a>
              ))}
            </div>
          )}
          <Link
            href={`/${entry.creator.slug}`}
            className="block text-center w-full py-2.5 rounded-button border border-bridge-border text-bridge-text text-label hover:bg-bridge-card transition-colors"
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
      className="flex items-center justify-between bg-bridge-card rounded-2xl border border-bridge-border/60 p-4 shadow-card hover:shadow-card-hover transition-shadow group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-bridge-heading text-body">{rollup.handle}</p>
        <p className="text-bridge-muted text-caption mt-0.5">
          {rollup.bookingCount} booking{rollup.bookingCount !== 1 ? 's' : ''} · {formatPrice(rollup.revenue)} driven
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-bridge-muted text-micro uppercase tracking-wide">Paid out</p>
          <p className="text-bridge-accent font-bold text-body">{formatPrice(rollup.earnings)}</p>
        </div>
        <ChevronRight size={16} className="text-bridge-border-strong group-hover:text-bridge-accent transition-colors" />
      </div>
    </Link>
  )
}
