import { BusinessService } from '@/services/business.service'
import ShopBookingPage from '@/components/ShopBookingPage'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Direct booking page — organic discovery, no creator attribution.
export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const [business, affiliations, content, recentBookings, me] = await Promise.all([
    BusinessService.getBySlug(slug),
    BusinessService.getAffiliations(slug),
    BusinessService.getContent(slug),
    BusinessService.getRecentBookingCount(slug),
    getCurrentUser(),
  ])

  if (!business) return notFound()

  return (
    <ShopBookingPage
      business={business}
      creator={null}
      link={null}
      affiliations={affiliations}
      content={content}
      recentBookings={recentBookings}
      isOwner={me?.businessSlug === business.slug}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const business = await BusinessService.getBySlug(slug)
  if (!business) return {}
  return {
    title: `${business.name} — Book via PLOI`,
    description: `Book ${business.name} on PLOI.`,
  }
}
