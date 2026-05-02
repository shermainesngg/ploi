import BusinessOnboarding from '@/components/BusinessOnboarding'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'List your business — BRIDGE',
  description: 'Set up your BRIDGE booking page in under 10 minutes.',
}

export default function Page() {
  return <BusinessOnboarding />
}
