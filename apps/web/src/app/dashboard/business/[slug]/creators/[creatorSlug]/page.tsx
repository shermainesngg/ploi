import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, MousePointerClick, Inbox, Wallet, Repeat, Play, Clapperboard } from 'lucide-react'
import { DashboardService } from '@/services/dashboard.service'
import { LinkService } from '@/services/link.service'
import { ContentService } from '@/services/content.service'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import { resolvePosterUrl } from '@/lib/poster'
import type { BookingWithCreator } from '@/lib/types'

interface PageProps {
  params: Promise<{ slug: string; creatorSlug: string }>
}

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }

const STATUS_BADGE: Record<BookingWithCreator['status'], string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-700',
}

/**
 * Per-creator performance page, business-owner-facing. A creator-dashboard-like
 * view scoped to ONE business: only the stats and bookings this creator's
 * videos garnered here. Linked from the Video stats modal in the Creators tab.
 */
export default async function Page({ params }: PageProps) {
  const { slug, creatorSlug } = await params

  // Same ownership guard as the parent dashboard — owner-only.
  const access = await authorizeBusinessDashboard(slug)
  if (access === 'unauthenticated') redirect(`/login?next=${encodeURIComponent(`/dashboard/business/${slug}/creators/${creatorSlug}`)}`)
  if (access !== 'granted') return notFound()

  const [data, myCreators] = await Promise.all([
    DashboardService.getBusinessDashboard(slug),
    LinkService.getMyCreators(slug),
  ])
  if (!data) return notFound()

  const entry = myCreators.find((e) => e.creator.slug === creatorSlug)
  if (!entry) return notFound()
  const { creator, link } = entry

  const videos = (await ContentService.listForBusiness(data.business.id))
    .filter((c) => c.content.creatorId === creator.id)

  // Bookings attributed to this creator: via their link directly, or repeat
  // bookings auto-attributed to them as the acquiring creator.
  const bookings = data.bookings.filter(
    (b) => b.creator?.slug === creatorSlug || b.acquiredBy?.slug === creatorSlug,
  )
  const active = bookings.filter((b) => b.status !== 'cancelled')
  const revenue = active.reduce((s, b) => s + b.price, 0)
  const commission = active.reduce((s, b) => s + Math.round(b.price * (b.commissionRate ?? 0)), 0)
  const repeats = active.filter((b) => b.isRepeat).length

  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Back to the Creators tab */}
        <Link
          href={`/dashboard/business/${slug}?tab=creators`}
          className="inline-flex items-center gap-1.5 text-caption font-semibold text-bridge-muted hover:text-bridge-text transition-colors"
        >
          <ArrowLeft size={14} /> {data.business.name}
        </Link>

        {/* Creator header */}
        <div className="flex items-center gap-3 mt-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ backgroundColor: creator.avatarColor }}
          >
            {creator.avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold text-bridge-heading leading-tight truncate">
              {creator.handle}
            </h1>
            <p className="text-bridge-muted text-caption truncate">{creator.displayName}</p>
          </div>
          <Link
            href={`/${creator.slug}`}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-button border border-bridge-border text-bridge-secondary text-caption font-semibold hover:bg-bridge-card transition-colors"
          >
            View profile <ExternalLink size={12} />
          </Link>
        </div>
        <p className="text-bridge-muted text-caption mt-3">
          Performance at {data.business.name} only — what this creator&apos;s videos have garnered for you.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Stat label="Link clicks" value={String(link.clickCount)} icon={<MousePointerClick size={14} />} />
          <Stat label="Bookings" value={String(active.length)} icon={<Inbox size={14} />} />
          <Stat label="Revenue driven" value={formatPrice(revenue)} icon={<Wallet size={14} />} accent />
          <Stat label="Their commission" value={formatPrice(commission)} icon={<Wallet size={14} />} />
          <Stat label="Repeat bookings" value={String(repeats)} icon={<Repeat size={14} />} />
          <Stat label="Live videos" value={String(videos.length)} icon={<Clapperboard size={14} />} />
        </div>

        {/* Their videos */}
        {videos.length > 0 && (
          <section className="mt-8">
            <h2 className="text-label text-bridge-muted uppercase tracking-widest mb-3">
              Their videos for your business
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {videos.map(({ content }) => {
                const poster = resolvePosterUrl(content.posterPath)
                return (
                  <a
                    key={content.id}
                    href={content.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-[9/16] rounded-media overflow-hidden bg-bridge-media-placeholder group"
                  >
                    {poster && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster} alt={content.caption ?? ''} className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-overlay-scrim" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-bridge-heading transition-transform group-hover:scale-105">
                        <Play size={14} className="ml-0.5 fill-current" />
                      </span>
                    </div>
                    {content.caption && (
                      <p className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-2 pt-5 text-micro font-medium text-white/95">
                        {content.caption}
                      </p>
                    )}
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* Bookings they garnered */}
        <section className="mt-8">
          <h2 className="text-label text-bridge-muted uppercase tracking-widest mb-3">
            Bookings via {creator.handle}
          </h2>
          {bookings.length === 0 ? (
            <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-8 text-center">
              <p className="text-bridge-muted text-body">No bookings from this creator yet.</p>
              <p className="text-bridge-muted/70 text-caption mt-1">
                Bookings made through their link will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-bridge-heading text-body truncate">{b.serviceName}</p>
                      <p className="text-bridge-muted text-caption mt-0.5">
                        {b.customerName} · {b.date} · {b.time}
                      </p>
                      {b.isRepeat && (
                        <p className="text-bridge-muted text-micro mt-1 flex items-center gap-1">
                          <Repeat size={10} /> Returning customer
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-micro font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status]}`}>
                        {b.status}
                      </span>
                      <p className="font-data text-body font-bold text-bridge-heading mt-1.5">{formatPrice(b.price)}</p>
                      {b.commissionRate != null && b.status !== 'cancelled' && (
                        <p className="font-data text-micro text-bridge-accent mt-0.5">
                          {formatPrice(Math.round(b.price * b.commissionRate))} commission
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({
  label, value, icon, accent,
}: {
  label: string; value: string; icon: React.ReactNode; accent?: boolean
}) {
  return (
    <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 p-4 shadow-card">
      <div className="flex items-center gap-2 mb-2 text-bridge-muted">
        {icon}
        <span className="text-micro uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-data text-2xl font-bold leading-none tracking-tight ${accent ? 'text-bridge-accent' : 'text-bridge-heading'}`}>
        {value}
      </p>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, creatorSlug } = await params
  return { title: `${creatorSlug} at ${slug} — PLOI` }
}
