import { CreatorService } from '@/services/creator.service'
import { BusinessService } from '@/services/business.service'
import CreatorProfilePage from '@/components/CreatorProfilePage'
import ShopBookingPage from '@/components/ShopBookingPage'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ creator: string }>
}

// Shared /[slug] namespace: a slug resolves to a creator profile if one exists,
// otherwise to a standalone business page (direct booking, no creator attribution).
export default async function Page({ params }: PageProps) {
  const { creator: slug } = await params

  // 1. Creator profile takes precedence.
  const { creator: creatorData, entries } = await CreatorService.getProfile(slug)
  if (creatorData) {
    const me = await getCurrentUser()
    const isOwner = !!me && me.creatorSlug === creatorData.slug
    return <CreatorProfilePage creator={creatorData} entries={entries} isOwner={isOwner} />
  }

  // 2. Fall back to a standalone business page (no creator → direct booking).
  const [{ business }, affiliations, content, recentBookings] = await Promise.all([
    BusinessService.getPageData('', slug),
    BusinessService.getAffiliations(slug),
    BusinessService.getContent(slug),
    BusinessService.getRecentBookingCount(slug),
  ])

  if (business) {
    return (
      <ShopBookingPage
        business={business}
        creator={null}
        link={null}
        affiliations={affiliations}
        content={content}
        recentBookings={recentBookings}
      />
    )
  }

  // 3. Neither a creator nor a business.
  return notFound()
}

export async function generateMetadata({ params }: PageProps) {
  const { creator: slug } = await params

  const { creator: c } = await CreatorService.getProfile(slug)
  if (c) return { title: `${c.handle} — PLOI`, description: c.bio }

  const { business } = await BusinessService.getPageData('', slug)
  if (business) {
    return {
      title: `${business.name} — Book via PLOI`,
      description: business.description,
    }
  }

  return {}
}
