'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, Check, ArrowLeft } from 'lucide-react'
import { createAuthBrowserClient, isSupabaseConfigured } from '@/lib/supabase'

function LoginInner() {
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
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
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
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full">
        <Link href="/" className="flex items-center gap-1 text-stone-400 text-xs mb-6 hover:text-stone-600">
          <ArrowLeft size={12} /> Back
        </Link>

        <span className="text-xs font-black tracking-tight text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">BRIDGE</span>

        {sent ? (
          <div className="mt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4 mx-auto">
              <Check size={28} className="text-rose-600" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black text-stone-900 mb-2">Check your inbox</h1>
            <p className="text-stone-500 text-sm">
              We sent a magic link to <span className="font-semibold text-stone-700">{email}</span>.
              Click it to sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-rose-600 text-sm font-semibold hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-black text-stone-900 mt-6 leading-tight">Welcome back</h1>
            <p className="text-stone-500 text-sm mt-1 mb-8">We&apos;ll email you a magic link. No passwords.</p>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoCapitalize="none" autoCorrect="off"
                  className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                />
              </div>
              {error && (
                <p className="text-red-600 text-xs mt-2">{error}</p>
              )}
              <button
                disabled={!email.trim() || sending}
                onClick={send}
                className="w-full mt-5 py-4 rounded-2xl bg-rose-600 text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-700 active:scale-[0.98] transition-all"
              >
                {sending ? 'Sending…' : 'Send magic link'}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-stone-200 text-center">
              <p className="text-stone-500 text-sm">
                New here?{' '}
                <Link href="/signup" className="text-rose-600 font-semibold hover:underline">
                  Get started
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
