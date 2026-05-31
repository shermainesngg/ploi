import { Megaphone } from 'lucide-react'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Creator login — PLOI',
}

export default function CreatorLoginPage() {
  return (
    <LoginForm
      role="creator"
      heading="Welcome back, creator"
      subcopy="Sign in to track your links and earnings. We'll email you a magic link — no passwords."
      icon={<Megaphone size={20} />}
      iconClassName="bg-bridge-accent-wash text-bridge-accent"
      signupHref="/onboard/creator"
      signupLabel="Join as a creator"
    />
  )
}
