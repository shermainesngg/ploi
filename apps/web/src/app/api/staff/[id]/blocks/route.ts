import { NextRequest, NextResponse } from 'next/server'
import { StaffService } from '@/services/staff.service'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const blocks = await StaffService.listBlocks(id)
  return NextResponse.json(blocks)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { blockDate, startTime, endTime, reason } = body
    if (!blockDate || !/^\d{4}-\d{2}-\d{2}$/.test(blockDate)) {
      return NextResponse.json({ error: 'blockDate must be YYYY-MM-DD' }, { status: 400 })
    }
    const block = await StaffService.createBlock(id, {
      blockDate,
      startTime: typeof startTime === 'string' ? startTime : undefined,
      endTime: typeof endTime === 'string' ? endTime : undefined,
      reason: typeof reason === 'string' ? reason : undefined,
    })
    return NextResponse.json(block, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
