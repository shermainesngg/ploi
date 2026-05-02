import { NextRequest, NextResponse } from 'next/server'
import { updateBookingStatus } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body
    if (status !== 'confirmed' && status !== 'declined') {
      return NextResponse.json({ error: 'status must be confirmed or declined' }, { status: 400 })
    }
    await updateBookingStatus(id, status)
    return NextResponse.json({ id, status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
