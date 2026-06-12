import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { NotificationFeedService } from '@/services/notification-feed.service'

/**
 * GET /api/notifications
 * In-app notification feed for the signed-in user, derived live from bookings.
 * Returns `{ items: FeedItem[] }` (empty when signed out) — read/unread state is
 * tracked client-side against each item's `createdAt`.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ items: [] })

  const items = await NotificationFeedService.listForUser(user)
  return NextResponse.json({ items })
}
