import { NextRequest, NextResponse } from 'next/server'
import { BusinessService } from '@/services/business.service'
import { createAuthServerClient } from '@/lib/supabase-server'
import { PLOI_ACTIVE_ROLE } from '@/lib/auth'

const ONE_YEAR = 60 * 60 * 24 * 365

export async function GET() {
  const businesses = await BusinessService.list()
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

    // If the visitor is signed in, attach the business to their auth user so it
    // joins their existing account (and default the contact email to theirs).
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const resolvedEmail =
      (typeof email === 'string' && email.trim() ? email.trim() : undefined) ?? user?.email

    const result = await BusinessService.create({
      slug, name, category, location, description, services,
      email: resolvedEmail,
      authUserId: user?.id,
      openingHours, contactPhone, contactWhatsapp, contactLine,
      photos: Array.isArray(photos) ? photos : undefined,
    })

    const res = NextResponse.json(result, { status: 201 })
    if (user) {
      res.cookies.set(PLOI_ACTIVE_ROLE, 'business', { path: '/', sameSite: 'lax', maxAge: ONE_YEAR })
    }
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
