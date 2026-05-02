import CreatorOnboarding from '@/components/CreatorOnboarding'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join as a creator — BRIDGE',
  description: 'Start earning commission on every booking you drive.',
}

export default function Page() {
  return <CreatorOnboarding />
}
