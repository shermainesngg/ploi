import { DashboardService } from '@/services/dashboard.service'
import CreatorDashboard from '@/components/CreatorDashboard'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const data = await DashboardService.getCreatorDashboard(slug)
  if (!data) return notFound()
  return <CreatorDashboard data={data} />
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  return { title: `${slug} dashboard — BRIDGE` }
}
