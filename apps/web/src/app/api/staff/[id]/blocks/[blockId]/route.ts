import { NextRequest, NextResponse } from 'next/server'
import { deleteStaffBlock } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  try {
    const { blockId } = await params
    await deleteStaffBlock(blockId)
    return NextResponse.json({ blockId, deleted: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
