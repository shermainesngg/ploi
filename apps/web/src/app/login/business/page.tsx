import { Store } from 'lucide-react'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Business login — PLOI',
}

export default function BusinessLoginPage() {
  return (
    <LoginForm
      role="business"
      heading="Sign in to manage your bookings"
      subcopy="Access your schedule, services, and creator attribution. We'll email you a magic link — no passwords."
      icon={<Store size={20} />}
      iconClassName="bg-bridge-surface text-bridge-secondary"
      signupHref="/onboard/business"
      signupLabel="List your business"
    />
  )
}
