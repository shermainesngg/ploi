import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, MousePointerClick, Inbox, Wallet, Repeat, Clapperboard, MapPin, Star, ChevronRight } from 'lucide-react'
import { DashboardService } from '@/services/dashboard.service'
import { LinkService } from '@/services/link.service'
import { ContentService } from '@/services/content.service'
import { BusinessService } from '@/services/business.service'
import { CreatorService, type CreatorBusinessLink } from '@/services/creator.service'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import { CreatorPerformance } from '@/components/dashboard/CreatorPerformance'

const FEED_PAGE_SIZE = 5

type Tab = 'performance' | 'collaborations'

interface PageProps {
  params: Promise<{ slug: string; creatorSlug: string }>
  searchParams: Promise<{ tab?: string }>
}

function formatPrice(thb: number) { return `฿${thb.toLocaleString()}` }

/**
 * Per-creator performance page, business-owner-facing. A creator-dashboard-like
 * view scoped to ONE business: only the stats and bookings this creator's
 * videos garnered here. Linked from the Video stats modal in the Creators tab.
 */
export default async function Page({ params, searchParams }: PageProps) {
  const { slug, creatorSlug } = await params
  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === 'collaborations' ? 'collaborations' : 'performance'

  // Same ownership guard as the parent dashboard — owner-only.
  const access = await authorizeBusinessDashboard(slug)
  if (access === 'unauthenticated') redirect(`/login?next=${encodeURIComponent(`/dashboard/business/${slug}/creators/${creatorSlug}`)}`)
  if (access !== 'granted') return notFound()

  // Always needed: business identity + confirm this creator actually works here.
  const [business, myCreators] = await Promise.all([
    BusinessService.getBySlug(slug),
    LinkService.getMyCreators(slug),
  ])
  if (!business) return notFound()

  const entry = myCreators.find((e) => e.creator.slug === creatorSlug)
  if (!entry) return notFound()
  const { creator, link } = entry

  // Per-tab data — fetch only what the active tab renders.
  let perf: {
    stats: Awaited<ReturnType<typeof DashboardService.getCreatorBookingStats>>
    initialFeed: Awaited<ReturnType<typeof DashboardService.listCreatorBookings>>
    videos: Awaited<ReturnType<typeof ContentService.listForBusiness>>
  } | null = null
  let otherBusinesses: CreatorBusinessLink[] = []

  if (tab === 'performance') {
    const [stats, initialFeed, contentList] = await Promise.all([
      DashboardService.getCreatorBookingStats(slug, creatorSlug),
      DashboardService.listCreatorBookings(slug, creatorSlug, { offset: 0, limit: FEED_PAGE_SIZE }),
      ContentService.listForBusiness(business.id),
    ])
    // Videos this creator made for this business, each tagged with its booking count.
    const videos = contentList
      .filter((c) => c.content.creatorId === creator.id)
      .map((v) => ({ ...v, stats: stats.byVideo[v.content.id] ?? { bookingCount: 0, revenue: 0 } }))
    perf = { stats, initialFeed, videos }
  } else {
    // Public affiliations only — exclude this business; never any private metrics.
    const profile = await CreatorService.getProfile(creatorSlug)
    otherBusinesses = profile.entries.filter((e) => e.business.slug !== slug)
  }

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

        {/* Tabs */}
        <div className="mt-5 flex gap-1 border-b border-bridge-border/60">
          <TabLink slug={slug} creatorSlug={creatorSlug} tab="performance" active={tab === 'performance'}>
            Performance
          </TabLink>
          <TabLink slug={slug} creatorSlug={creatorSlug} tab="collaborations" active={tab === 'collaborations'}>
            Also works with
          </TabLink>
        </div>

        {tab === 'performance' && perf ? (
          <>
            <p className="text-bridge-muted text-caption mt-4">
              Performance at {business.name} only — what this creator&apos;s videos have garnered for you.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Stat label="Link clicks" value={String(link.clickCount)} icon={<MousePointerClick size={14} />} />
              <Stat label="Bookings" value={String(perf.stats.bookingCount)} icon={<Inbox size={14} />} />
              <Stat label="Revenue driven" value={formatPrice(perf.stats.revenue)} icon={<Wallet size={14} />} accent />
              <Stat label="Their commission" value={formatPrice(perf.stats.commission)} icon={<Wallet size={14} />} />
              <Stat label="Repeat bookings" value={String(perf.stats.repeats)} icon={<Repeat size={14} />} />
              <Stat label="Live videos" value={String(perf.videos.length)} icon={<Clapperboard size={14} />} />
            </div>

            {/* Videos (tap to filter) + filterable, paginated bookings feed */}
            <CreatorPerformance
              businessSlug={slug}
              creatorSlug={creatorSlug}
              creatorHandle={creator.handle}
              videos={perf.videos}
              initialItems={perf.initialFeed.items}
              initialHasMore={perf.initialFeed.hasMore}
              pageSize={FEED_PAGE_SIZE}
            />
          </>
        ) : (
          <OtherBusinesses handle={creator.handle} entries={otherBusinesses} />
        )}
      </div>
    </div>
  )
}

function TabLink({
  slug, creatorSlug, tab, active, children,
}: {
  slug: string; creatorSlug: string; tab: Tab; active: boolean; children: React.ReactNode
}) {
  return (
    <Link
      href={`/dashboard/business/${slug}/creators/${creatorSlug}?tab=${tab}`}
      className={`-mb-px px-3 py-2.5 text-caption font-semibold border-b-2 transition-colors ${
        active
          ? 'border-bridge-accent text-bridge-heading'
          : 'border-transparent text-bridge-muted hover:text-bridge-text'
      }`}
    >
      {children}
    </Link>
  )
}

/**
 * Other businesses this creator works with — public affiliations only (the same
 * info shown on their /[creator] profile). Deliberately shows no private metrics
 * of those businesses; it's a credibility + discovery signal, not a data leak.
 */
function OtherBusinesses({ handle, entries }: { handle: string; entries: CreatorBusinessLink[] }) {
  if (entries.length === 0) {
    return (
      <div className="mt-6 bg-bridge-card rounded-2xl border border-bridge-border/60 p-8 text-center">
        <p className="text-bridge-muted text-body">{handle} doesn&apos;t work with any other businesses yet.</p>
        <p className="text-bridge-muted/70 text-caption mt-1">They&apos;re exclusive to you for now.</p>
      </div>
    )
  }
  return (
    <div className="mt-5">
      <p className="text-bridge-muted text-caption mb-4">
        {handle} also posts for {entries.length} other business{entries.length !== 1 ? 'es' : ''}. Public profiles only.
      </p>
      <div className="space-y-2">
        {entries.map(({ business }) => (
          <Link
            key={business.slug}
            href={`/shop/${business.slug}`}
            className="flex items-center gap-3 bg-bridge-card rounded-2xl border border-bridge-border/60 p-3 shadow-card hover:shadow-card-hover transition-shadow group"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-bridge-media-placeholder flex-shrink-0">
              {business.coverPhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-bridge-heading text-body truncate">{business.name}</p>
              <p className="text-bridge-muted text-caption truncate">{business.category}</p>
              <div className="flex items-center gap-3 mt-0.5 text-micro text-bridge-muted">
                <span className="flex items-center gap-1"><MapPin size={10} /> {business.location}</span>
                <span className="flex items-center gap-1"><Star size={10} className="fill-current" /> {business.rating}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-bridge-border-strong group-hover:text-bridge-accent transition-colors flex-shrink-0" />
          </Link>
        ))}
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
