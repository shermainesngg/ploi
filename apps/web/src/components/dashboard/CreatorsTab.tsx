'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, X, ExternalLink, ChevronRight, Music, Instagram, Youtube, Twitter, Globe, Inbox, EyeOff, Play, Sparkles,
  UserRound, BarChart3,
} from 'lucide-react'
import type { CreatorRollup, SocialPlatform, ContentWithCreator } from '@/lib/types'
import type { PendingLinkRequest, MyCreatorEntry } from '@/services/link.service'
import { resolvePosterUrl } from '@/lib/poster'
import { moderateContent } from '@/actions/content.actions'
import { Modal } from '@/components/ui'
import { MediaFrame } from '@/components/ui/MediaFrame'
import { adapterForUrl } from '@/lib/providers'

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

interface ServiceSummary {
  id: string
  name: string
  duration: number
  price: number
}

interface Props {
  pendingRequests: PendingLinkRequest[]
  myCreators: MyCreatorEntry[]
  creatorRollups: CreatorRollup[]
  pendingContent: ContentWithCreator[]
  activeContent: ContentWithCreator[]
  businessId: string
  services: ServiceSummary[]
}

export default function CreatorsTab({
  pendingRequests, myCreators, creatorRollups, pendingContent, activeContent, businessId, services,
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
              <PendingRequestCard key={r.link.id} request={r} services={services} />
            ))}
          </div>
        </Section>
      )}

      {/* My Creators */}
      {myCreators.length > 0 && (
        <Section title="My Creators" badge={myCreators.length}>
          <div className="space-y-3">
            {myCreators.map((e) => (
              <MyCreatorCard
                key={e.creator.id}
                entry={e}
                videos={activeContent.filter((c) => c.content.creatorId === e.creator.id)}
              />
            ))}
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

function PendingRequestCard({ request, services }: { request: PendingLinkRequest; services: ServiceSummary[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  async function decide(status: 'active' | 'declined') {
    setBusy(true)
    try {
      await fetch(`/api/links/${request.link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setOpen(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-amber-50/30 rounded-2xl border border-amber-200 p-4 shadow-card">
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-start gap-3 mb-3 text-left group"
      >
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
        <ChevronRight size={16} className="text-bridge-border-strong group-hover:text-bridge-accent flex-shrink-0 mt-3 transition-colors" />
      </button>

      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 mb-3 px-3 py-2 bg-bridge-card border border-bridge-border rounded-button text-caption text-bridge-secondary hover:border-bridge-accent-light transition-colors"
      >
        {request.link.platform && <PlatformIcon platform={request.link.platform} />}
        <span className="font-mono truncate flex-1 text-left">View request</span>
        <ChevronRight size={11} className="text-bridge-muted flex-shrink-0" />
      </button>

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
      <CommissionDisclaimer />

      <PendingRequestModal
        open={open}
        onClose={() => setOpen(false)}
        request={request}
        services={services}
        busy={busy}
        onDecide={decide}
      />
    </div>
  )
}

/**
 * Full request detail: the creator's profile + what they're asking for + their
 * video. The video plays inline when an embed adapter owns the URL (TikTok);
 * otherwise it falls back to the thumbnail linking out. Mounts the iframe only
 * while the modal is open — same single-iframe discipline as ContentPlayer.
 */
function PendingRequestModal({
  open, onClose, request, services, busy, onDecide,
}: {
  open: boolean
  onClose: () => void
  request: PendingLinkRequest
  services: ServiceSummary[]
  busy: boolean
  onDecide: (status: 'active' | 'declined') => void
}) {
  const { creator, link } = request
  const featured = link.featuredServiceIds
    .map((id) => services.find((s) => s.id === id))
    .filter(Boolean) as ServiceSummary[]

  const adapter = link.contentUrl ? adapterForUrl(link.contentUrl) : null
  const parsed = adapter && link.contentUrl ? adapter.parse(link.contentUrl) : null
  const embedUrl = adapter && parsed ? adapter.getEmbedUrl(parsed.externalId) : null

  return (
    <Modal open={open} onClose={onClose} title="Creator request">
      <div className="space-y-4">
        {/* Who they are */}
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: creator.avatarColor }}
          >
            {creator.avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-bridge-heading text-body truncate">{creator.displayName}</p>
            <p className="text-bridge-muted text-caption">{creator.handle}</p>
          </div>
          <Link
            href={`/${creator.slug}`}
            className="flex-shrink-0 text-caption font-semibold text-bridge-accent hover:underline mt-1"
          >
            Full profile →
          </Link>
        </div>

        {creator.bio && (
          <p className="text-bridge-secondary text-body leading-relaxed">{creator.bio}</p>
        )}

        {creator.socials.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {creator.socials.map((s) => (
              <a
                key={s.platform + s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-bridge-surface border border-bridge-border hover:border-bridge-accent-light px-2.5 py-1.5 rounded-full text-caption font-medium text-bridge-secondary transition-colors"
              >
                <PlatformIcon platform={s.platform} />
                {platformLabel(s.platform)}
              </a>
            ))}
          </div>
        )}

        {/* What they're asking for */}
        {featured.length > 0 && (
          <div className="bg-bridge-surface rounded-xl p-3">
            <p className="text-micro uppercase tracking-wide text-bridge-muted flex items-center gap-1.5 mb-2">
              <Sparkles size={11} /> Wants to feature
            </p>
            <div className="space-y-1.5">
              {featured.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-body text-bridge-heading truncate">{s.name}</span>
                  <span className="font-data text-caption text-bridge-secondary flex-shrink-0">
                    {formatPrice(s.price)} · {s.duration} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Their video */}
        {link.contentUrl && (
          <div>
            <p className="text-micro uppercase tracking-wide text-bridge-muted mb-2">Their video</p>
            {embedUrl ? (
              <>
                <MediaFrame aspectRatio={parsed?.aspectRatio ?? 'vertical'} radius="media" className="bg-black">
                  {open && (
                    <iframe
                      src={embedUrl}
                      title={`Video by ${creator.handle}`}
                      loading="lazy"
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  )}
                </MediaFrame>
                <p className="mt-1.5 text-center text-caption text-bridge-muted">Tap the video to play</p>
              </>
            ) : link.contentThumbnailUrl ? (
              <a
                href={link.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-[9/16] max-h-72 rounded-media overflow-hidden bg-bridge-media-placeholder"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={link.contentThumbnailUrl} alt={`Video by ${creator.handle}`} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-overlay-scrim" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-bridge-heading">
                    <Play size={20} className="ml-0.5 fill-current" />
                  </span>
                </div>
              </a>
            ) : null}
            <a
              href={link.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 text-caption font-medium text-bridge-accent"
            >
              View on {link.platform ? platformLabel(link.platform) : 'platform'} <ExternalLink size={13} />
            </a>
          </div>
        )}

        {/* Decide */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onDecide('declined')}
            disabled={busy}
            className="flex-1 py-2.5 rounded-button border border-bridge-border text-bridge-secondary text-label hover:bg-bridge-surface disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
          >
            <X size={14} /> Decline
          </button>
          <button
            onClick={() => onDecide('active')}
            disabled={busy}
            className="flex-1 py-2.5 rounded-button bg-bridge-accent text-white text-label hover:bg-bridge-accent-dark disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
          >
            <Check size={14} /> Accept
          </button>
        </div>
        <CommissionDisclaimer />
      </div>
    </Modal>
  )
}

/** Shown under the Accept action — what saying yes commits the business to. */
function CommissionDisclaimer() {
  return (
    <p className="mt-2 text-center text-micro text-bridge-muted leading-relaxed">
      Commission: <span className="font-data">10%</span> per booking via their link
      · <span className="font-data">5%</span> on repeat customers for 6 months
    </p>
  )
}

function MyCreatorCard({ entry, videos }: { entry: MyCreatorEntry; videos: ContentWithCreator[] }) {
  const [open, setOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
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
            <span>·</span>
            <span>{entry.contentCount} connected video{entry.contentCount !== 1 ? 's' : ''}</span>
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
          <div className="flex gap-2">
            <Link
              href={`/${entry.creator.slug}`}
              className="flex-1 text-center py-2.5 rounded-button border border-bridge-border text-bridge-text text-label hover:bg-bridge-card flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserRound size={14} /> View profile
            </Link>
            <button
              onClick={() => setStatsOpen(true)}
              className="flex-1 py-2.5 rounded-button bg-bridge-ink text-bridge-ink-foreground text-label hover:opacity-90 flex items-center justify-center gap-1.5 transition-opacity"
            >
              <BarChart3 size={14} /> Video stats
            </button>
          </div>
        </div>
      )}

      <CreatorStatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        entry={entry}
        videos={videos}
      />
    </div>
  )
}

/**
 * Per-creator performance for THIS business: link-level stats (clicks,
 * bookings, revenue) plus the live videos behind them. Per-video metrics
 * aren't tracked yet — attribution is per link — so stats sit at the top
 * and the videos that drove them are listed below.
 */
function CreatorStatsModal({
  open, onClose, entry, videos,
}: {
  open: boolean
  onClose: () => void
  entry: MyCreatorEntry
  videos: ContentWithCreator[]
}) {
  const { creator, link } = entry
  return (
    <Modal open={open} onClose={onClose} title={`${creator.handle} stats`}>
      <div className="space-y-4">
        {/* Link-level performance */}
        <div className="grid grid-cols-2 gap-2">
          <StatCell label="Link clicks" value={String(link.clickCount)} />
          <StatCell label="Bookings" value={String(entry.bookingCount)} />
          <StatCell label="Revenue driven" value={formatPrice(entry.revenue)} accent />
          <StatCell label="Live videos" value={String(entry.contentCount)} />
        </div>

        {/* The videos behind the numbers */}
        {videos.length > 0 ? (
          <div>
            <p className="text-micro uppercase tracking-wide text-bridge-muted mb-2">
              Their videos for your business
            </p>
            <div className="space-y-2">
              {videos.map(({ content }) => {
                const poster = resolvePosterUrl(content.posterPath)
                return (
                  <a
                    key={content.id}
                    href={content.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 bg-bridge-surface rounded-xl border border-bridge-border/60 hover:border-bridge-accent-light transition-colors"
                  >
                    <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-bridge-media-placeholder flex-shrink-0">
                      {poster && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play size={14} className="text-white fill-current drop-shadow" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-bridge-heading line-clamp-2 leading-snug">
                        {content.caption ?? 'Untitled video'}
                      </p>
                      <p className="text-micro text-bridge-muted mt-0.5 flex items-center gap-1">
                        <PlatformIcon platform={content.provider} size={10} />
                        {platformLabel(content.provider)}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-bridge-muted flex-shrink-0" />
                  </a>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-caption text-bridge-muted text-center py-2">
            No live videos yet — their link is active, but no content is connected.
          </p>
        )}

        <Link
          href={`/dashboard/business/${link.businessSlug}/creators/${creator.slug}`}
          className="block text-center w-full py-2.5 rounded-button bg-bridge-ink text-bridge-ink-foreground text-label hover:opacity-90 transition-opacity"
        >
          View full stats →
        </Link>
      </div>
    </Modal>
  )
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-bridge-surface rounded-xl p-3">
      <p className="text-micro uppercase tracking-wide text-bridge-muted">{label}</p>
      <p className={`font-data text-lg font-bold tracking-tight mt-1 ${accent ? 'text-bridge-accent' : 'text-bridge-heading'}`}>
        {value}
      </p>
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
