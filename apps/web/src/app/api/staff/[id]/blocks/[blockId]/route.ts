import { NextRequest, NextResponse } from 'next/server'
import { StaffService } from '@/services/staff.service'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  try {
    const { blockId } = await params
    await StaffService.deleteBlock(blockId)
    return NextResponse.json({ blockId, deleted: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
