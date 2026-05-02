import { NextRequest, NextResponse } from 'next/server'
import { getCreatorProfile } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { creator, entries } = await getCreatorProfile(slug)
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ creator, entries })
}
