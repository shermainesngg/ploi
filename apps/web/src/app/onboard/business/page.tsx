import BusinessOnboarding from '@/components/BusinessOnboarding'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'List your business — PLOI',
  description: 'Set up your PLOI booking page in under 10 minutes.',
}

export default async function Page() {
  const user = await getCurrentUser()
  // Identities are exclusive — a creator account can't also list a business
  // (and an account that already owns one goes home to its dashboard).
  if (user?.businessSlug) redirect('/business')
  if (user?.creatorSlug) redirect(`/dashboard/creator/${user.creatorSlug}`)

  return <BusinessOnboarding />
}
