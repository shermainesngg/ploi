import type { ContentWithCreator, BookingWithCreator } from '@/lib/types'

/**
 * Attach per-video booking performance to a list of videos by crediting each
 * booking to its `contentId`. Cancelled bookings are excluded. Returns new
 * objects with `.stats` set; videos with no bookings get zeroes (not undefined),
 * so the dashboard can render "0 bookings" rather than a blank.
 *
 * Used only on business-dashboard surfaces — never on public pages, so booking
 * counts never leak to customers.
 */
export function attachBookingStats(
  videos: ContentWithCreator[],
  bookings: BookingWithCreator[],
): ContentWithCreator[] {
  const byContent = new Map<string, { bookingCount: number; revenue: number }>()
  for (const b of bookings) {
    if (!b.contentId || b.status === 'cancelled') continue
    const cur = byContent.get(b.contentId) ?? { bookingCount: 0, revenue: 0 }
    cur.bookingCount += 1
    cur.revenue += b.price
    byContent.set(b.contentId, cur)
  }
  return videos.map((v) => ({
    ...v,
    stats: byContent.get(v.content.id) ?? { bookingCount: 0, revenue: 0 },
  }))
}
