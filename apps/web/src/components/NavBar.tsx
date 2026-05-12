'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Search, Menu, X, LogOut, LayoutDashboard, Calendar } from 'lucide-react'
import type { AppUser } from '@/lib/auth'

export default function NavBar({ user }: { user: AppUser | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const HIDE_ON = ['/login', '/signup', '/auth/callback']
  if (HIDE_ON.some((p) => pathname?.startsWith(p))) return null

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    setOpen(false)
    router.refresh()
    router.push('/')
  }

  const dashHref =
    user?.role === 'creator' && user.creatorSlug ? `/dashboard/creator/${user.creatorSlug}` :
    user?.role === 'business' && user.businessSlug ? `/dashboard/business/${user.businessSlug}` :
    '/bookings'

  return (
    <>
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-bridge-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-bridge-accent">BRIDGE</span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center text-bridge-muted hover:text-bridge-text transition-colors rounded-full hover:bg-bridge-surface"
              aria-label="Search"
              onClick={() => router.push('/')}
            >
              <Search size={17} />
            </button>

            {user ? (
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-bridge-surface transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.avatarInitials}
                </div>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1">
                <Link
                  href="/login"
                  className="text-label text-bridge-secondary hover:text-bridge-text px-3 py-1.5 transition-colors rounded-button hover:bg-bridge-surface"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-label text-white bg-bridge-accent hover:bg-bridge-accent-dark px-3.5 py-1.5 rounded-button transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ml-0.5 w-9 h-9 flex items-center justify-center text-bridge-muted hover:text-bridge-text transition-colors rounded-full hover:bg-bridge-surface"
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <>
          <div className="fixed inset-0 bg-bridge-heading/40 z-40 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-bridge-border/50">
              <span className="font-display text-lg font-bold tracking-tight text-bridge-accent">BRIDGE</span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-bridge-surface hover:bg-bridge-border transition-colors"
              >
                <X size={16} className="text-bridge-secondary" />
              </button>
            </div>

            {user && (
              <div className="px-4 py-4 border-b border-bridge-border/50 flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.avatarInitials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-bridge-heading text-label truncate">{user.displayName}</p>
                  <p className="text-bridge-muted text-caption truncate">{user.email}</p>
                  <p className="text-micro text-bridge-accent uppercase tracking-wide mt-0.5">{user.role}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 py-3">
              <NavLink href="/" label="Home" onClick={() => setOpen(false)} />

              {user && user.role !== 'consumer' && (
                <NavLink
                  href={dashHref}
                  label="Dashboard"
                  icon={<LayoutDashboard size={15} />}
                  onClick={() => setOpen(false)}
                />
              )}

              {user && (
                <NavLink
                  href="/bookings"
                  label="My bookings"
                  icon={<Calendar size={15} />}
                  onClick={() => setOpen(false)}
                />
              )}

              {!user && (
                <>
                  <NavLink href="/login" label="Log in" onClick={() => setOpen(false)} />
                  <NavLink href="/signup" label="Sign up" onClick={() => setOpen(false)} />
                </>
              )}

              <div className="my-2 border-t border-bridge-border/40" />

              <NavLink href="/onboard/creator" label="Join as creator" onClick={() => setOpen(false)} />
              <NavLink href="/onboard/business" label="List your business" onClick={() => setOpen(false)} />
            </div>

            {user && (
              <div className="p-4 border-t border-bridge-border/50">
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-button bg-bridge-surface hover:bg-bridge-border transition-colors text-bridge-secondary text-label"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

function NavLink({
  href, label, icon, onClick,
}: {
  href: string
  label: string
  icon?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-button hover:bg-bridge-surface text-bridge-secondary hover:text-bridge-text text-label transition-colors"
    >
      {icon && <span className="text-bridge-muted">{icon}</span>}
      <span>{label}</span>
    </Link>
  )
}
