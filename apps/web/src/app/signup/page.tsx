import Link from 'next/link'
import { Megaphone, Store, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export const metadata = {
  title: 'Sign up — PLOI',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-bridge-bg flex flex-col items-center justify-center px-5 py-16">
      <Card className="max-w-sm w-full p-6 sm:p-8">
        <div className="text-center mb-10">
          <span className="font-display text-sm font-bold text-bridge-heading">PLOI</span>
          <h1 className="font-display text-heading text-bridge-heading mt-6 leading-tight">I am a…</h1>
          <p className="text-bridge-muted text-body mt-2">Pick the path that fits you.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/onboard/creator"
            className="flex items-start gap-4 bg-bridge-card rounded-card border-2 border-bridge-accent-soft hover:border-bridge-accent hover:shadow-card-hover transition-all duration-200 p-5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2"
          >
            <div className="w-11 h-11 rounded-lg bg-bridge-accent-wash flex items-center justify-center flex-shrink-0 text-bridge-accent">
              <Megaphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-bridge-heading text-body">A creator looking to earn</p>
              <p className="text-bridge-muted text-caption mt-0.5">Share spots you love. Earn 10% on every booking.</p>
            </div>
            <ArrowRight size={16} className="text-bridge-muted group-hover:text-bridge-accent mt-2 transition-colors flex-shrink-0" />
          </Link>

          <Link
            href="/onboard/business"
            className="flex items-start gap-4 bg-bridge-card rounded-card border-2 border-bridge-border hover:border-bridge-heading hover:shadow-card-hover transition-all duration-200 p-5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2"
          >
            <div className="w-11 h-11 rounded-lg bg-bridge-surface flex items-center justify-center flex-shrink-0 text-bridge-secondary">
              <Store size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-bridge-heading text-body">A business looking to grow</p>
              <p className="text-bridge-muted text-caption mt-0.5">List your services. Get bookings driven by creator content.</p>
            </div>
            <ArrowRight size={16} className="text-bridge-muted group-hover:text-bridge-heading mt-2 transition-colors flex-shrink-0" />
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-bridge-border/60 text-center">
          <p className="text-bridge-muted text-body">
            Just want to book?{' '}
            <Link href="/" className="text-bridge-accent font-semibold hover:underline cursor-pointer">Browse places</Link>
          </p>
          <p className="text-bridge-muted text-caption mt-3">
            Already have an account?{' '}
            <Link href="/login" className="text-bridge-secondary font-semibold hover:underline cursor-pointer">Log in</Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
