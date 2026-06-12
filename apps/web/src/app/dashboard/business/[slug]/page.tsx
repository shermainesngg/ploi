import BusinessDashboardScreen, { type DashboardSearchParams } from '@/components/dashboard/BusinessDashboardScreen'
import { authorizeBusinessDashboard } from '@/lib/ownership'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<DashboardSearchParams>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params

  // Ownership guard — a claimed business's dashboard is owner-only.
  const access = await authorizeBusinessDashboard(slug)
  if (access === 'unauthenticated') redirect(`/login?next=${encodeURIComponent(`/dashboard/business/${slug}`)}`)
  if (access !== 'granted') return notFound()

  return <BusinessDashboardScreen slug={slug} searchParams={await searchParams} />
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  return { title: `${slug} dashboard — PLOI` }
}
