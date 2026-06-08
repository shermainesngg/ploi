import CreatorOnboarding from '@/components/CreatorOnboarding'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join as a creator — PLOI',
  description: 'Start earning commission on every booking you drive.',
}

export default async function Page() {
  // Business identities are exclusive — a business account can't also join
  // as a creator. Send them home to their dashboard instead (and an account
  // that's already a creator goes to its dashboard, not back through signup).
  const user = await getCurrentUser()
  if (user?.businessSlug) redirect('/business')
  if (user?.creatorSlug) redirect(`/dashboard/creator/${user.creatorSlug}`)

  return <CreatorOnboarding />
}
