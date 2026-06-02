'use client'

import { useState, Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, Lock, Check, ArrowLeft } from 'lucide-react'
import { createAuthBrowserClient, isSupabaseConfigured } from '@/lib/supabase'
import { signInWithGoogle } from '@/lib/auth-client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface LoginFormProps {
  /** 'signin' (default) signs into an existing account; 'signup' creates a new one. */
  mode?: 'signin' | 'signup'
  heading?: string
  subcopy?: string
  /** Where the footer "New here? / Already have an account?" link points. */
  signupHref?: string
  signupLabel?: string
  /** Extra links rendered in the card footer — e.g. "become a creator" / "list a business". */
  secondary?: ReactNode
}

type Method = 'password' | 'magic'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  )
}

function LoginFormInner({
  mode = 'signin',
  heading,
  subcopy,
  signupHref,
  signupLabel,
  secondary,
}: LoginFormProps) {
  const isSignup = mode === 'signup'
  const params = useSearchParams()
  const next = params.get('next') ?? '/'
  const errorParam = params.get('error')

  // Sensible defaults per mode — callers can still override any of these.
  const resolvedHeading = heading ?? (isSignup ? 'Create your account' : 'Welcome back')
  const resolvedSubcopy =
    subcopy ?? (isSignup ? 'Sign up to browse and book experiences you’ll love.' : 'Sign in to your PLOI account.')
  const resolvedSignupHref = signupHref ?? (isSignup ? '/login' : '/signup')
  const resolvedSignupLabel = signupLabel ?? (isSignup ? 'Log in' : 'Get started')
  const footerPrompt = isSignup ? 'Already have an account?' : 'New here?'

  const [method, setMethod] = useState<Method>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'no_user' || errorParam === 'missing_code'
      ? 'That sign-in link expired or was already used. Please request a new one.'
      : errorParam,
  )

  function assertConfigured() {
    if (!isSupabaseConfigured()) {
      throw new Error('Auth not configured. Add Supabase keys to .env.local.')
    }
  }

  function goToPostLogin() {
    // Session is set client-side; let the server route the user to the right dashboard.
    const dest = new URL(`${window.location.origin}/auth/post-login`)
    if (next && next !== '/') dest.searchParams.set('next', next)
    window.location.href = dest.toString()
  }

  async function submitPassword() {
    setBusy(true)
    setError(null)
    try {
      assertConfigured()
      const supabase = createAuthBrowserClient()

      if (isSignup) {
        const callback = new URL(`${window.location.origin}/auth/callback`)
        if (next && next !== '/') callback.searchParams.set('next', next)
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callback.toString() },
        })
        if (error) throw new Error(error.message)
        // If email confirmation is enabled there's no session yet — tell them to check
        // their inbox. Otherwise we have a live session and can route straight in.
        if (data.session) goToPostLogin()
        else setConfirmSent(true)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw new Error(error.message)
      goToPostLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : isSignup ? 'Could not create account' : 'Could not sign in')
      setBusy(false)
    }
  }

  async function sendMagicLink() {
    setBusy(true)
    setError(null)
    try {
      assertConfigured()
      const supabase = createAuthBrowserClient()
      const callback = new URL(`${window.location.origin}/auth/callback`)
      if (next && next !== '/') callback.searchParams.set('next', next)
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callback.toString() },
      })
      if (error) throw new Error(error.message)
      setMagicSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send link')
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle(next)
      // signInWithGoogle redirects the page; nothing more to do on success.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in')
      setBusy(false)
    }
  }

  async function sendReset() {
    setBusy(true)
    setError(null)
    try {
      assertConfigured()
      const supabase = createAuthBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // Route through the callback so the recovery code is exchanged for a session
        // before we land on the set-new-password page.
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) throw new Error(error.message)
      setResetSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    method === 'password' ? email.trim() && password : email.trim()

  return (
    <div className="min-h-screen bg-bridge-bg flex flex-col items-center justify-center px-5 py-16">
      <Card className="max-w-sm w-full p-6 sm:p-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-bridge-muted text-caption mb-8 hover:text-bridge-text transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent rounded"
        >
          <ArrowLeft size={12} /> Back
        </Link>

        <span className="font-display text-sm font-bold text-bridge-heading">PLOI</span>

        {magicSent ? (
          <ConfirmScreen
            email={email}
            title="Check your inbox"
            body={isSignup ? 'Click it to finish signing up.' : 'Click it to sign in.'}
            onReset={() => setMagicSent(false)}
          />
        ) : confirmSent ? (
          <ConfirmScreen
            email={email}
            title="Confirm your email"
            body="Click it to activate your account, then come back to book."
            onReset={() => setConfirmSent(false)}
          />
        ) : resetSent ? (
          <ConfirmScreen
            email={email}
            title="Reset link sent"
            body="Click it to set a new password."
            onReset={() => setResetSent(false)}
          />
        ) : (
          <>
            <h1 className="font-display text-heading text-bridge-heading mt-6 leading-tight">{resolvedHeading}</h1>
            <p className="text-bridge-muted text-body mt-1.5 mb-7">{resolvedSubcopy}</p>

            <Button
              variant="secondary"
              size="lg"
              onClick={google}
              loading={busy}
              className="w-full cursor-pointer gap-2"
            >
              <GoogleIcon /> {isSignup ? 'Sign up with Google' : 'Continue with Google'}
            </Button>

            <div className="flex items-center gap-3 my-6">
              <span className="h-px flex-1 bg-bridge-border/70" />
              <span className="text-bridge-muted text-micro uppercase tracking-wide">or</span>
              <span className="h-px flex-1 bg-bridge-border/70" />
            </div>

            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect="off"
                icon={<Mail size={14} />}
                error={method === 'password' ? undefined : error ?? undefined}
              />

              {method === 'password' && (
                <div>
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    icon={<Lock size={14} />}
                    error={error ?? undefined}
                  />
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={sendReset}
                      disabled={!email.trim() || busy}
                      className="mt-2 text-bridge-muted text-caption hover:text-bridge-accent transition-colors cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent rounded"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

              <Button
                disabled={!canSubmit}
                loading={busy}
                onClick={method === 'password' ? submitPassword : sendMagicLink}
                size="lg"
                className="w-full cursor-pointer"
              >
                {method === 'password'
                  ? isSignup ? 'Create account' : 'Sign in'
                  : isSignup ? 'Email me a sign-up link' : 'Send magic link'}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMethod((m) => (m === 'password' ? 'magic' : 'password'))
                setError(null)
              }}
              className="mt-5 w-full text-center text-bridge-secondary text-label hover:text-bridge-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent rounded"
            >
              {method === 'password'
                ? 'Email me a link instead'
                : isSignup ? 'Sign up with a password instead' : 'Sign in with a password instead'}
            </button>

            <div className="mt-8 pt-6 border-t border-bridge-border/60 text-center">
              <p className="text-bridge-muted text-body">
                {footerPrompt}{' '}
                <Link href={resolvedSignupHref} className="text-bridge-accent font-semibold hover:underline cursor-pointer">
                  {resolvedSignupLabel}
                </Link>
              </p>
              {secondary && <div className="mt-4">{secondary}</div>}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function ConfirmScreen({
  email, title, body, onReset,
}: {
  email: string
  title: string
  body: string
  onReset: () => void
}) {
  return (
    <div className="mt-10 text-center">
      <div className="w-14 h-14 rounded-full bg-bridge-accent-wash flex items-center justify-center mb-5 mx-auto">
        <Check size={24} className="text-bridge-accent" strokeWidth={2.5} />
      </div>
      <h1 className="font-display text-heading text-bridge-heading mb-2">{title}</h1>
      <p className="text-bridge-muted text-body">
        We sent a link to <span className="font-semibold text-bridge-text">{email}</span>. {body}
      </p>
      <button
        onClick={onReset}
        className="mt-6 text-bridge-accent text-label hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent rounded"
      >
        Use a different email
      </button>
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
