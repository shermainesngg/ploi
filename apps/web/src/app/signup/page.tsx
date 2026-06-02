import Link from 'next/link'
import { Megaphone, Store } from 'lucide-react'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Sign up — PLOI',
}

export default function SignupPage() {
  // The primary path is a regular user creating an account to browse and book.
  // Earning as a creator or listing a business are secondary, opt-in paths.
  return (
    <LoginForm
      mode="signup"
      heading="Create your account"
      subcopy="Sign up to browse and book Bangkok’s best salons, spas, and studios."
      secondary={
        <div className="space-y-1.5">
          <Link
            href="/onboard/creator"
            className="flex items-center justify-center gap-1.5 text-bridge-secondary text-caption hover:text-bridge-accent transition-colors cursor-pointer"
          >
            <Megaphone size={13} /> Want to earn? Become a creator
          </Link>
          <Link
            href="/onboard/business"
            className="flex items-center justify-center gap-1.5 text-bridge-secondary text-caption hover:text-bridge-accent transition-colors cursor-pointer"
          >
            <Store size={13} /> Run a business? List it on PLOI
          </Link>
        </div>
      }
    />
  )
}
