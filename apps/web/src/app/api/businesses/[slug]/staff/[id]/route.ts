import { NextRequest, NextResponse } from 'next/server'
import { StaffService } from '@/services/staff.service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    await StaffService.update(id, {
      name: body.name,
      role: body.role,
      photoUrl: body.photoUrl,
      serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds : undefined,
    })
    return NextResponse.json({ id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { id } = await params
    await StaffService.deactivate(id)
    return NextResponse.json({ id, deactivated: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
