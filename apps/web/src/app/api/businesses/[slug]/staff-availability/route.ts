import { NextRequest, NextResponse } from 'next/server'
import { StaffService } from '@/services/staff.service'
import { BusinessRepo } from '@/repositories/business.repo'
import { authorizeBusinessDashboard } from '@/lib/ownership'

// GET /api/businesses/[slug]/staff-availability?serviceId=&date=&time=&excludeBookingId=
// Per-staff availability verdict for one booking slot — drives the greyed-out
// staff chips in the dashboard. Owner-only.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const access = await authorizeBusinessDashboard(slug)
  if (access === 'unauthenticated') return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (access !== 'granted') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const serviceId = sp.get('serviceId')
  const date = sp.get('date')
  const time = sp.get('time')
  if (!serviceId || !date || !time) {
    return NextResponse.json({ error: 'serviceId, date and time are required' }, { status: 400 })
  }

  const businessId = await BusinessRepo.findIdBySlug(slug)
  if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  try {
    const availability = await StaffService.getStaffAvailabilityForBooking({
      businessId,
      serviceId,
      bookingDate: date,
      bookingTime: time,
      excludeBookingId: sp.get('excludeBookingId') ?? undefined,
    })
    return NextResponse.json({ availability })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
