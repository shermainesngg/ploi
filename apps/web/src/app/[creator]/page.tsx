import { CreatorService } from '@/services/creator.service'
import CreatorProfilePage from '@/components/CreatorProfilePage'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ creator: string }>
}

export default async function Page({ params }: PageProps) {
  const { creator } = await params
  const { creator: creatorData, entries } = await CreatorService.getProfile(creator)

  if (!creatorData) return notFound()

  return <CreatorProfilePage creator={creatorData} entries={entries} />
}

export async function generateMetadata({ params }: PageProps) {
  const { creator } = await params
  const { creator: c } = await CreatorService.getProfile(creator)
  if (!c) return {}
  return {
    title: `${c.handle} — BRIDGE`,
    description: c.bio,
  }
}
