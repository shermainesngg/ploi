import {
  getBusinessDashboard,
  getPendingLinkRequests,
  getMyCreators,
  getBusinessStripeStatus,
} from '@/lib/db'
import BusinessDashboard from '@/components/BusinessDashboard'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const [data, pendingRequests, myCreators, stripeStatus] = await Promise.all([
    getBusinessDashboard(slug),
    getPendingLinkRequests(slug),
    getMyCreators(slug),
    getBusinessStripeStatus(slug),
  ])
  if (!data) return notFound()
  return (
    <BusinessDashboard
      data={data}
      pendingRequests={pendingRequests}
      myCreators={myCreators}
      stripeConnected={stripeStatus.hasAccount}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  return { title: `${slug} dashboard — BRIDGE` }
}
