import { NextRequest, NextResponse } from 'next/server'
import { DashboardService, type CreatorBookingFilters } from '@/services/dashboard.service'
import { authorizeBusinessDashboard } from '@/lib/ownership'

// GET /api/dashboard/business/[slug]/creators/[creatorSlug]/bookings
//   ?offset=&limit=&status=&type=&video=&range=
// Paginated, filtered per-creator bookings feed. Owner-only — same guard as the
// dashboard page it backs.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; creatorSlug: string }> },
) {
  const { slug, creatorSlug } = await params

  const access = await authorizeBusinessDashboard(slug)
  if (access === 'unauthenticated') return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (access !== 'granted') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const type = sp.get('type')
  const range = sp.get('range')

  const filters: CreatorBookingFilters & { offset?: number; limit?: number } = {
    offset: Number(sp.get('offset')) || 0,
    limit: Number(sp.get('limit')) || 5,
    status: status === 'confirmed' || status === 'pending' || status === 'cancelled' ? status : undefined,
    type: type === 'new' || type === 'repeat' ? type : undefined,
    videoId: sp.get('video') ?? undefined,
    range: range === '30' || range === '90' || range === 'all' ? range : undefined,
  }

  try {
    const result = await DashboardService.listCreatorBookings(slug, creatorSlug, filters)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
