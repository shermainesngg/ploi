import { NextRequest, NextResponse } from 'next/server'
import { StaffService } from '@/services/staff.service'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const schedule = await StaffService.getSchedule(id)
  return NextResponse.json(schedule)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an array' }, { status: 400 })
    }
    // Validate each entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = body.map((e: any) => {
      if (typeof e.dayOfWeek !== 'number' || e.dayOfWeek < 0 || e.dayOfWeek > 6) {
        throw new Error('dayOfWeek must be 0-6')
      }
      if (!/^\d{2}:\d{2}/.test(e.startTime) || !/^\d{2}:\d{2}/.test(e.endTime)) {
        throw new Error('startTime and endTime must be HH:MM')
      }
      return {
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        isAvailable: !!e.isAvailable,
      }
    })
    await StaffService.setSchedule(id, entries)
    return NextResponse.json({ id, ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
