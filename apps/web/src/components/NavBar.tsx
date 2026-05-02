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

  // Hide on auth/booking-flow pages where the nav would be visual noise
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
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-100">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-rose-600">BRIDGE</span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-700"
              aria-label="Search"
              onClick={() => router.push('/')}
            >
              <Search size={17} />
            </button>

            {user ? (
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-stone-100"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.avatarInitials}
                </div>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-stone-700 hover:text-stone-900 px-3 py-1.5"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg"
                >
                  Sign up
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ml-1 w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-900"
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu sheet */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <span className="text-base font-black tracking-tight text-rose-600">BRIDGE</span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200"
              >
                <X size={16} className="text-stone-600" />
              </button>
            </div>

            {user && (
              <div className="px-4 py-4 border-b border-stone-100 flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-black flex-shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.avatarInitials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 text-sm truncate">{user.displayName}</p>
                  <p className="text-stone-400 text-xs truncate">{user.email}</p>
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mt-0.5">{user.role}</p>
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

              <div className="my-2 border-t border-stone-100" />

              <NavLink href="/onboard/creator" label="Join as creator" onClick={() => setOpen(false)} />
              <NavLink href="/onboard/business" label="List your business" onClick={() => setOpen(false)} />
            </div>

            {user && (
              <div className="p-4 border-t border-stone-100">
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold"
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
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-stone-50 text-stone-700 text-sm font-medium"
    >
      {icon && <span className="text-stone-400">{icon}</span>}
      <span>{label}</span>
    </Link>
  )
}
