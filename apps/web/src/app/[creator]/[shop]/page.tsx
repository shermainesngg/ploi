import { getPageData, getBusinessAffiliations, getRecentBookingCount } from '@/lib/db'
import ShopBookingPage from '@/components/ShopBookingPage'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ creator: string; shop: string }>
}

export default async function Page({ params }: PageProps) {
  const { creator, shop } = await params
  const [{ business, creator: creatorData, link }, affiliations, recentBookings] =
    await Promise.all([
      getPageData(creator, shop),
      getBusinessAffiliations(shop),
      getRecentBookingCount(shop),
    ])

  if (!business) return notFound()

  return (
    <ShopBookingPage
      business={business}
      creator={creatorData}
      link={link}
      affiliations={affiliations}
      recentBookings={recentBookings}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { creator, shop } = await params
  const { business, creator: creatorData } = await getPageData(creator, shop)
  if (!business) return {}
  return {
    title: `${business.name} — Book via BRIDGE`,
    description: creatorData
      ? `Recommended by ${creatorData.handle}. Book ${business.name} on BRIDGE.`
      : `Book ${business.name} on BRIDGE.`,
  }
}
