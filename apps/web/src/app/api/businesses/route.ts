import { NextRequest, NextResponse } from 'next/server'
import { createBusiness, listBusinesses } from '@/lib/db'

export async function GET() {
  const businesses = await listBusinesses()
  return NextResponse.json(businesses)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, category, location, description, email, services,
      openingHours, contactPhone, contactWhatsapp, contactLine, photos,
    } = body

    if (!name || !category || !location || !services?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!contactPhone && !contactWhatsapp && !contactLine) {
      return NextResponse.json(
        { error: 'At least one contact method is required.' },
        { status: 400 },
      )
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40)

    const result = await createBusiness({
      slug, name, category, location, description, services,
      email: typeof email === 'string' && email.trim() ? email.trim() : undefined,
      openingHours, contactPhone, contactWhatsapp, contactLine,
      photos: Array.isArray(photos) ? photos : undefined,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
