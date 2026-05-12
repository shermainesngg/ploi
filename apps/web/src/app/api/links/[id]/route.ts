import { NextRequest, NextResponse } from 'next/server'
import { LinkService } from '@/services/link.service'
import type { LinkStatus } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body
    const valid: LinkStatus[] = ['pending', 'active', 'declined']
    if (!valid.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${valid.join(', ')}` }, { status: 400 })
    }
    await LinkService.updateStatus(id, status)
    return NextResponse.json({ id, status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
