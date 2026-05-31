import { BusinessService } from '@/services/business.service'
import ShopBookingPage from '@/components/ShopBookingPage'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ creator: string; shop: string }>
}

export default async function Page({ params }: PageProps) {
  const { creator, shop } = await params
  const [{ business, creator: creatorData, link }, affiliations, content, recentBookings] =
    await Promise.all([
      BusinessService.getPageData(creator, shop),
      BusinessService.getAffiliations(shop),
      BusinessService.getContent(shop),
      BusinessService.getRecentBookingCount(shop),
    ])

  if (!business) return notFound()

  return (
    <ShopBookingPage
      business={business}
      creator={creatorData}
      link={link}
      affiliations={affiliations}
      content={content}
      recentBookings={recentBookings}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { creator, shop } = await params
  const { business, creator: creatorData } = await BusinessService.getPageData(creator, shop)
  if (!business) return {}
  return {
    title: `${business.name} — Book via PLOI`,
    description: creatorData
      ? `Recommended by ${creatorData.handle}. Book ${business.name} on PLOI.`
      : `Book ${business.name} on PLOI.`,
  }
}
