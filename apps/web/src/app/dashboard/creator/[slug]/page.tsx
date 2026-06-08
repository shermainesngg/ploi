import { DashboardService } from '@/services/dashboard.service'
import CreatorDashboard from '@/components/CreatorDashboard'
import { authorizeCreatorDashboard } from '@/lib/ownership'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isStripeConfigured } from '@/lib/stripe'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params

  // Ownership guard — a claimed creator's dashboard is owner-only.
  const access = await authorizeCreatorDashboard(slug)
  if (access === 'unauthenticated') redirect(`/login?next=${encodeURIComponent(`/dashboard/creator/${slug}`)}`)
  if (access !== 'granted') return notFound()

  const data = await DashboardService.getCreatorDashboard(slug)
  if (!data) return notFound()

  // Only prompt for payout setup when Stripe is live and the account is missing.
  let payoutsConnected = true
  if (isSupabaseConfigured() && isStripeConfigured()) {
    const db = createServerClient()
    const { data: row } = await db
      .from('creators')
      .select('stripe_account_id')
      .eq('slug', slug)
      .maybeSingle()
    payoutsConnected = !!row?.stripe_account_id
  }

  return <CreatorDashboard data={data} payoutsConnected={payoutsConnected} />
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  return { title: `${slug} dashboard — PLOI` }
}
