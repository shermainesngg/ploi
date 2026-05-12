import { NextRequest, NextResponse } from 'next/server'
import { DashboardService } from '@/services/dashboard.service'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await req.json()
    const { serviceId, staffId, customerName, bookingDate, bookingTime } = body
    if (!serviceId || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'serviceId, bookingDate, bookingTime required' }, { status: 400 })
    }
    const row = await DashboardService.createWalkinBooking({
      businessSlug: slug,
      serviceId,
      staffId: typeof staffId === 'string' ? staffId : undefined,
      customerName: typeof customerName === 'string' ? customerName : '',
      bookingDate,
      bookingTime,
    })
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
