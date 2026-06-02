'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { Search, Menu, X, LogOut, LayoutDashboard, Calendar, Sun, Moon, Check, Megaphone, Store, Bookmark, Heart } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { AppUser, UserRole } from '@/lib/auth'
import { setActiveRole } from '@/actions/auth.actions'
import { PloiLogo } from '@/components/ui/Logo'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <div className="w-9 h-9" />
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 flex items-center justify-center text-bridge-muted hover:text-bridge-text transition-colors rounded-full hover:bg-bridge-surface"
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

export default function NavBar({ user }: { user: AppUser | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [switching, startSwitch] = useTransition()

  const HIDE_ON = ['/login', '/signup', '/auth/callback']
  if (HIDE_ON.some((p) => pathname?.startsWith(p))) return null

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    setOpen(false)
    router.refresh()
    router.push('/')
  }

  // Dashboard-backed roles the user can switch between (creator / business).
  const roleTargets: { role: UserRole; label: string; href: string; icon: React.ReactNode }[] = []
  if (user?.creatorSlug) {
    roleTargets.push({ role: 'creator', label: 'Creator dashboard', href: `/dashboard/creator/${user.creatorSlug}`, icon: <Megaphone size={15} /> })
  }
  if (user?.businessSlug) {
    roleTargets.push({ role: 'business', label: 'Business dashboard', href: `/dashboard/business/${user.businessSlug}`, icon: <Store size={15} /> })
  }
  const showSwitcher = roleTargets.length > 1

  function switchRole(role: UserRole, href: string) {
    if (role === user?.activeRole) {
      setOpen(false)
      return
    }
    startSwitch(async () => {
      await setActiveRole(role)
      setOpen(false)
      router.push(href)
      router.refresh()
    })
  }

  // The consumer-style section (bookings, saved items) shows for everyone who
  // owns a non-business identity. A business-only account never sees it.
  const showRegular = !!user && user.roles.some((r) => r !== 'business')

  return (
    <>
      <nav
        className="sticky top-0 z-30 backdrop-blur-md border-b border-bridge-border/40"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bridge-card) 85%, transparent)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="PLOI home">
            <PloiLogo size={22} />
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center text-bridge-muted hover:text-bridge-text transition-colors rounded-full hover:bg-bridge-surface"
              aria-label="Search"
              onClick={() => router.push('/search')}
            >
              <Search size={17} />
            </button>

            <ThemeToggle />

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
                  className="text-label text-bridge-ink-foreground bg-bridge-ink hover:bg-bridge-ink-hover px-3.5 py-1.5 rounded-button transition-colors"
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
          <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-bridge-card z-50 shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-bridge-border/50">
              <PloiLogo size={22} />
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

            {showSwitcher && (
              <div className="px-2 pt-3 pb-1 border-b border-bridge-border/50">
                <p className="px-3 pb-1.5 text-micro text-bridge-muted uppercase tracking-wide">Switch to</p>
                {roleTargets.map(({ role, label, href, icon }) => {
                  const active = role === user?.activeRole
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={switching}
                      onClick={() => switchRole(role, href)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-button text-label transition-colors disabled:opacity-50 ${
                        active
                          ? 'bg-bridge-surface text-bridge-text'
                          : 'text-bridge-secondary hover:bg-bridge-surface hover:text-bridge-text'
                      }`}
                    >
                      <span className="text-bridge-muted">{icon}</span>
                      <span className="flex-1 text-left">{label}</span>
                      {active && <Check size={15} className="text-bridge-accent" />}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 py-3">
              {user?.creatorSlug && (
                <div className="pb-1">
                  <p className="px-3 pb-1.5 text-micro text-bridge-muted uppercase tracking-wide">Creator</p>
                  <NavLink
                    href={`/dashboard/creator/${user.creatorSlug}`}
                    label="Dashboard"
                    icon={<LayoutDashboard size={15} />}
                    onClick={() => setOpen(false)}
                  />
                </div>
              )}

              {user?.businessSlug && (
                <div className="pb-1">
                  <p className="px-3 pb-1.5 text-micro text-bridge-muted uppercase tracking-wide">Business</p>
                  <NavLink
                    href={`/dashboard/business/${user.businessSlug}`}
                    label="Dashboard"
                    icon={<LayoutDashboard size={15} />}
                    onClick={() => setOpen(false)}
                  />
                </div>
              )}

              {showRegular && (user?.creatorSlug || user?.businessSlug) && (
                <div className="my-2 border-t border-bridge-border/40" />
              )}

              {showRegular && (
                <div className="pb-1">
                  <NavLink
                    href="/bookings"
                    label="My bookings"
                    icon={<Calendar size={15} />}
                    onClick={() => setOpen(false)}
                  />
                  <NavLink
                    href="/saved/content"
                    label="Saved content"
                    icon={<Bookmark size={15} />}
                    onClick={() => setOpen(false)}
                  />
                  <NavLink
                    href="/saved/businesses"
                    label="Saved businesses"
                    icon={<Heart size={15} />}
                    onClick={() => setOpen(false)}
                  />
                </div>
              )}

              {!user && (
                <>
                  <NavLink href="/login" label="Log in" onClick={() => setOpen(false)} />
                  <NavLink href="/signup" label="Sign up" onClick={() => setOpen(false)} />
                </>
              )}

              <div className="my-2 border-t border-bridge-border/40" />

              {!user?.creatorSlug && (
                <NavLink href="/onboard/creator" label="Join as creator" onClick={() => setOpen(false)} />
              )}
              {!user && (
                <NavLink href="/onboard/business" label="List your business" onClick={() => setOpen(false)} />
              )}
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
