import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/lib/availability'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  const serviceId = url.searchParams.get('serviceId') ?? undefined
  const staffId = url.searchParams.get('staffId') ?? undefined
  const locationId = url.searchParams.get('locationId') ?? undefined

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) required' }, { status: 400 })
  }

  const result = await getAvailableSlots(slug, date, serviceId, staffId, locationId)
  if (!result) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  return NextResponse.json(result)
}
