import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Megaphone, Store, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { getActiveRoleCookie } from '@/lib/auth'

export const metadata = {
  title: 'Log in — PLOI',
}

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams

  // Returning users: auto-route to the role they last used. Skip when an error is
  // being surfaced so they can re-read it on the chooser.
  if (!error) {
    const lastRole = await getActiveRoleCookie()
    const suffix = next ? `?next=${encodeURIComponent(next)}` : ''
    if (lastRole === 'creator') redirect(`/login/creator${suffix}`)
    if (lastRole === 'business') redirect(`/login/business${suffix}`)
  }

  const suffix = next ? `?next=${encodeURIComponent(next)}` : ''

  return (
    <div className="min-h-screen bg-bridge-bg flex flex-col items-center justify-center px-5 py-16">
      <Card className="max-w-sm w-full p-6 sm:p-8">
        <div className="text-center mb-10">
          <span className="font-display text-sm font-bold text-bridge-heading">PLOI</span>
          <h1 className="font-display text-heading text-bridge-heading mt-6 leading-tight">Welcome back</h1>
          <p className="text-bridge-muted text-body mt-2">How do you want to sign in?</p>
        </div>

        {error && (
          <p className="mb-5 rounded-input bg-red-500/10 px-3 py-2 text-caption text-red-600 dark:text-red-400">
            {error === 'no_user' || error === 'missing_code'
              ? 'That sign-in link expired or was already used. Please request a new one.'
              : error}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href={`/login/creator${suffix}`}
            className="flex items-start gap-4 bg-bridge-card rounded-card border-2 border-bridge-accent-soft hover:border-bridge-accent hover:shadow-card-hover transition-all duration-200 p-5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2"
          >
            <div className="w-11 h-11 rounded-lg bg-bridge-accent-wash flex items-center justify-center flex-shrink-0 text-bridge-accent">
              <Megaphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-bridge-heading text-body">I&apos;m a creator</p>
              <p className="text-bridge-muted text-caption mt-0.5">Track your links and earnings.</p>
            </div>
            <ArrowRight size={16} className="text-bridge-muted group-hover:text-bridge-accent mt-2 transition-colors flex-shrink-0" />
          </Link>

          <Link
            href={`/login/business${suffix}`}
            className="flex items-start gap-4 bg-bridge-card rounded-card border-2 border-bridge-border hover:border-bridge-heading hover:shadow-card-hover transition-all duration-200 p-5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2"
          >
            <div className="w-11 h-11 rounded-lg bg-bridge-surface flex items-center justify-center flex-shrink-0 text-bridge-secondary">
              <Store size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-bridge-heading text-body">I run a business</p>
              <p className="text-bridge-muted text-caption mt-0.5">Manage your schedule and bookings.</p>
            </div>
            <ArrowRight size={16} className="text-bridge-muted group-hover:text-bridge-heading mt-2 transition-colors flex-shrink-0" />
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-bridge-border/60 text-center">
          <p className="text-bridge-muted text-body">
            New here?{' '}
            <Link href="/signup" className="text-bridge-accent font-semibold hover:underline cursor-pointer">
              Get started
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
