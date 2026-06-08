import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, MousePointerClick, Inbox, Wallet, Repeat, Clapperboard } from 'lucide-react'
import { DashboardService } from '@/services/dashboard.service'
import { LinkService } from '@/services/link.service'
import { ContentService } from '@/services/content.service'
import { BusinessService } from '@/services/business.service'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import { CreatorPerformance } from '@/components/dashboard/CreatorPerformance'

const FEED_PAGE_SIZE = 5

interface PageProps {
  params: Promise<{ slug: string; creatorSlug: string }>
}

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }

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

  // Lightweight aggregates + first feed page — no longer loads the whole-business
  // booking payload just to slice out one creator.
  const [business, myCreators, stats, initialFeed] = await Promise.all([
    BusinessService.getBySlug(slug),
    LinkService.getMyCreators(slug),
    DashboardService.getCreatorBookingStats(slug, creatorSlug),
    DashboardService.listCreatorBookings(slug, creatorSlug, { offset: 0, limit: FEED_PAGE_SIZE }),
  ])
  if (!business) return notFound()

  const entry = myCreators.find((e) => e.creator.slug === creatorSlug)
  if (!entry) return notFound()
  const { creator, link } = entry

  // Videos this creator made for this business, each tagged with its booking count.
  const videos = (await ContentService.listForBusiness(business.id))
    .filter((c) => c.content.creatorId === creator.id)
    .map((v) => ({ ...v, stats: stats.byVideo[v.content.id] ?? { bookingCount: 0, revenue: 0 } }))

  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Back to the Creators tab */}
        <Link
          href={`/dashboard/business/${slug}?tab=creators`}
          className="inline-flex items-center gap-1.5 text-caption font-semibold text-bridge-muted hover:text-bridge-text transition-colors"
        >
          <ArrowLeft size={14} /> {business.name}
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
          Performance at {business.name} only — what this creator&apos;s videos have garnered for you.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Stat label="Link clicks" value={String(link.clickCount)} icon={<MousePointerClick size={14} />} />
          <Stat label="Bookings" value={String(stats.bookingCount)} icon={<Inbox size={14} />} />
          <Stat label="Revenue driven" value={formatPrice(stats.revenue)} icon={<Wallet size={14} />} accent />
          <Stat label="Their commission" value={formatPrice(stats.commission)} icon={<Wallet size={14} />} />
          <Stat label="Repeat bookings" value={String(stats.repeats)} icon={<Repeat size={14} />} />
          <Stat label="Live videos" value={String(videos.length)} icon={<Clapperboard size={14} />} />
        </div>

        {/* Videos (tap to filter) + filterable, paginated bookings feed */}
        <CreatorPerformance
          businessSlug={slug}
          creatorSlug={creatorSlug}
          creatorHandle={creator.handle}
          videos={videos}
          initialItems={initialFeed.items}
          initialHasMore={initialFeed.hasMore}
          pageSize={FEED_PAGE_SIZE}
        />
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
