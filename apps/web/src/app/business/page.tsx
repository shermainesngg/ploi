import { getCurrentUser } from '@/lib/auth'
import BusinessLanding from '@/components/BusinessLanding'
import BusinessDashboardScreen, { type DashboardSearchParams } from '@/components/dashboard/BusinessDashboardScreen'

interface PageProps {
  searchParams: Promise<DashboardSearchParams>
}

/**
 * /business — the business home.
 * A signed-in business owner lands here after login and sees their dashboard
 * (slug resolved from their own account, so no ownership guard is needed).
 * Everyone else sees the marketing landing page.
 */
export default async function Page({ searchParams }: PageProps) {
  const user = await getCurrentUser()

  if (user?.businessSlug) {
    return <BusinessDashboardScreen slug={user.businessSlug} searchParams={await searchParams} />
  }

  return <BusinessLanding />
}

export async function generateMetadata() {
  const user = await getCurrentUser()
  if (user?.businessSlug) {
    return { title: `${user.businessSlug} dashboard — PLOI` }
  }
  return {
    title: 'PLOI for businesses — bookings that know who sent the customer',
    description:
      'A free booking system for salons, spas & studios. Calendar, staff schedules, walk-ins — plus creator attribution. Pay only when a creator brings you a customer.',
  }
}
