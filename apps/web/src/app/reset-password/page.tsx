'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Check } from 'lucide-react'
import { createAuthBrowserClient, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

// Reached via the password-recovery email, which routes through /auth/callback first
// so a session is already established by the time the user lands here.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (!isSupabaseConfigured()) throw new Error('Auth not configured.')
      if (password.length < 8) throw new Error('Password must be at least 8 characters.')
      if (password !== confirm) throw new Error('Passwords do not match.')

      const supabase = createAuthBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      setDone(true)
      // Hand off to the server to route them to the right dashboard.
      window.location.href = '/auth/post-login'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-bridge-bg flex flex-col items-center justify-center px-5 py-16">
      <Card className="max-w-sm w-full p-6 sm:p-8">
        <span className="font-display text-sm font-bold text-bridge-heading">PLOI</span>

        {done ? (
          <div className="mt-10 text-center">
            <div className="w-14 h-14 rounded-full bg-bridge-accent-wash flex items-center justify-center mb-5 mx-auto">
              <Check size={24} className="text-bridge-accent" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-heading text-bridge-heading mb-2">Password updated</h1>
            <p className="text-bridge-muted text-body">Signing you in…</p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-heading text-bridge-heading mt-6 leading-tight">Set a new password</h1>
            <p className="text-bridge-muted text-body mt-1.5 mb-7">Choose a password for your account.</p>

            <div className="space-y-4">
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                icon={<Lock size={14} />}
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                icon={<Lock size={14} />}
                error={error ?? undefined}
              />
              <Button
                disabled={!password || !confirm}
                loading={busy}
                onClick={save}
                size="lg"
                className="w-full cursor-pointer"
              >
                Update password
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-bridge-border/60 text-center">
              <p className="text-bridge-muted text-body">
                <Link href="/login" className="text-bridge-accent font-semibold hover:underline cursor-pointer">
                  Back to sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
