import BusinessOnboarding from '@/components/BusinessOnboarding'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'List your business — PLOI',
  description: 'Set up your PLOI booking page in under 10 minutes.',
}

export default function Page() {
  return <BusinessOnboarding />
}
