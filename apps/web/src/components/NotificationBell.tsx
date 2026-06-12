'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import type { FeedItem, FeedTone } from '@/services/notification-feed.service'

/** localStorage key holding the ISO timestamp of the newest notification seen. */
const SEEN_KEY = 'ploi_notif_seen'

const TONE_DOT: Record<FeedTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  default: 'bg-bridge-muted',
}

function readSeen(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(SEEN_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeSeen(value: string) {
  try {
    window.localStorage.setItem(SEEN_KEY, value)
  } catch {
    /* ignore quota/availability errors — the badge just won't persist */
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (Number.isNaN(then) || diff < 0) return ''
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  // `seen` drives the badge; `viewedSince` freezes at open time so unread dots
  // stay visible for the whole time the panel is open (even after we clear seen).
  const [seen, setSeen] = useState('')
  const viewedSince = useRef('')
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = (await res.json()) as { items: FeedItem[] }
      setItems(data.items ?? [])
    } catch {
      /* network/offline — leave the existing list as-is */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setSeen(readSeen())
    load()
  }, [load])

  // Close on any click outside the bell + panel, and on Escape. A document
  // listener (rather than a backdrop element) is required here: the navbar's
  // `backdrop-blur` makes `position: fixed` children be contained by the navbar
  // box, so a full-page `fixed inset-0` backdrop wouldn't cover the page below.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const newest = items[0]?.createdAt ?? ''
  const unreadCount = items.filter((i) => i.createdAt > seen).length

  function toggle() {
    if (!open) {
      viewedSince.current = seen
      // Opening clears the badge: mark everything currently loaded as seen.
      if (newest && newest > seen) {
        setSeen(newest)
        writeSeen(newest)
      }
    }
    setOpen((v) => !v)
  }

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative w-9 h-9 flex items-center justify-center text-bridge-muted hover:text-bridge-text transition-colors rounded-full hover:bg-bridge-surface"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-bridge-accent text-white text-[9px] font-bold font-data leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-bridge-card border border-bridge-border/60 rounded-modal shadow-2xl z-50 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bridge-border/50">
              <p className="font-semibold text-bridge-heading text-label">Notifications</p>
              {items.length > 0 && (
                <span className="text-micro text-bridge-muted font-data">{items.length}</span>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <p className="px-4 py-8 text-center text-bridge-muted text-caption">Loading…</p>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={22} className="mx-auto text-bridge-muted mb-2" />
                  <p className="text-bridge-secondary text-label">You&apos;re all caught up</p>
                  <p className="text-bridge-muted text-caption mt-0.5">New booking activity shows up here.</p>
                </div>
              ) : (
                items.map((item) => {
                  const unread = item.createdAt > viewedSince.current
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.href)}
                      className={`w-full text-left flex gap-2.5 px-4 py-3 border-b border-bridge-border/40 last:border-0 transition-colors hover:bg-bridge-surface ${
                        unread ? 'bg-bridge-surface/40' : ''
                      }`}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${TONE_DOT[item.tone]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-bridge-heading text-label font-medium truncate">{item.title}</p>
                          <span className="text-micro text-bridge-muted font-data flex-shrink-0">{timeAgo(item.createdAt)}</span>
                        </div>
                        <p className="text-bridge-secondary text-caption mt-0.5 line-clamp-2">{item.body}</p>
                      </div>
                      {unread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-bridge-accent flex-shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
        </div>
      )}
    </div>
  )
}
