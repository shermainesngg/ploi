import { NextRequest, NextResponse } from 'next/server'
import { listStaff, createStaffMember } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const staff = await listStaff(slug)
  return NextResponse.json(staff)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await req.json()
    const { name, role, photoUrl, serviceIds } = body
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const staff = await createStaffMember(slug, {
      name,
      role: typeof role === 'string' ? role : undefined,
      photoUrl: typeof photoUrl === 'string' ? photoUrl : undefined,
      serviceIds: Array.isArray(serviceIds) ? serviceIds : [],
    })
    return NextResponse.json(staff, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 })
  }
}
