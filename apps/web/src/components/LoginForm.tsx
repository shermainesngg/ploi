'use client'

import { useState, Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, Check, ArrowLeft } from 'lucide-react'
import { createAuthBrowserClient, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export type LoginRole = 'creator' | 'business'

interface LoginFormProps {
  /** Wires the callback to route into the right role's dashboard / onboarding. */
  role?: LoginRole
  heading: string
  subcopy: string
  icon: ReactNode
  /** Tailwind classes for the icon badge (background + text). */
  iconClassName: string
  /** Where the "New here?" link should point. */
  signupHref: string
  signupLabel: string
}

function LoginFormInner({
  role, heading, subcopy, icon, iconClassName, signupHref, signupLabel,
}: LoginFormProps) {
  const params = useSearchParams()
  const next = params.get('next') ?? '/'
  const errorParam = params.get('error')

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(errorParam)

  async function send() {
    setSending(true)
    setError(null)
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Auth not configured. Add Supabase keys to .env.local.')
      }
      const supabase = createAuthBrowserClient()
      const callback = new URL(`${window.location.origin}/auth/callback`)
      if (role) callback.searchParams.set('role', role)
      if (next && next !== '/') callback.searchParams.set('next', next)
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callback.toString() },
      })
      if (error) throw new Error(error.message)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send link')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-bridge-bg flex flex-col items-center justify-center px-5 py-16">
      <Card className="max-w-sm w-full p-6 sm:p-8">
        <Link
          href="/login"
          className="flex items-center gap-1 text-bridge-muted text-caption mb-8 hover:text-bridge-text transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent rounded"
        >
          <ArrowLeft size={12} /> Back
        </Link>

        <span className="font-display text-sm font-bold text-bridge-heading">PLOI</span>

        {sent ? (
          <div className="mt-10 text-center">
            <div className="w-14 h-14 rounded-full bg-bridge-accent-wash flex items-center justify-center mb-5 mx-auto">
              <Check size={24} className="text-bridge-accent" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-heading text-bridge-heading mb-2">Check your inbox</h1>
            <p className="text-bridge-muted text-body">
              We sent a magic link to <span className="font-semibold text-bridge-text">{email}</span>.
              Click it to sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-bridge-accent text-label hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent rounded"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div className={`mt-6 w-11 h-11 rounded-lg flex items-center justify-center ${iconClassName}`}>
              {icon}
            </div>
            <h1 className="font-display text-heading text-bridge-heading mt-4 leading-tight">{heading}</h1>
            <p className="text-bridge-muted text-body mt-1.5 mb-8">{subcopy}</p>

            <div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect="off"
                icon={<Mail size={14} />}
                error={error ?? undefined}
              />
              <Button
                disabled={!email.trim()}
                loading={sending}
                onClick={send}
                size="lg"
                className="w-full mt-5 cursor-pointer"
              >
                Send magic link
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-bridge-border/60 text-center">
              <p className="text-bridge-muted text-body">
                New here?{' '}
                <Link href={signupHref} className="text-bridge-accent font-semibold hover:underline cursor-pointer">
                  {signupLabel}
                </Link>
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default function LoginForm(props: LoginFormProps) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner {...props} />
    </Suspense>
  )
}
