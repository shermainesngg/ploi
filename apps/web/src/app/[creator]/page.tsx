import { CreatorService } from '@/services/creator.service'
import CreatorProfilePage from '@/components/CreatorProfilePage'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ creator: string }>
}

export default async function Page({ params }: PageProps) {
  const { creator } = await params
  const { creator: creatorData, entries } = await CreatorService.getProfile(creator)

  if (!creatorData) return notFound()

  const me = await getCurrentUser()
  const isOwner = !!me && me.creatorSlug === creatorData.slug

  return <CreatorProfilePage creator={creatorData} entries={entries} isOwner={isOwner} />
}

export async function generateMetadata({ params }: PageProps) {
  const { creator } = await params
  const { creator: c } = await CreatorService.getProfile(creator)
  if (!c) return {}
  return {
    title: `${c.handle} — PLOI`,
    description: c.bio,
  }
}
