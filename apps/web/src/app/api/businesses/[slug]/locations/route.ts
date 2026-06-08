import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createLocationSchema } from '@/validation/location.schema'
import { LocationService } from '@/services/location.service'
import { authorizeBusinessDashboard } from '@/lib/ownership'

/** Owner-guard shared by both handlers. Returns a NextResponse on failure. */
async function guard(slug: string): Promise<NextResponse | null> {
  const access = await authorizeBusinessDashboard(slug)
  if (access === 'not_found') {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  if (access !== 'granted') {
    return NextResponse.json(
      { error: 'Not authorized to manage this business' },
      { status: access === 'unauthenticated' ? 401 : 403 },
    )
  }
  return null
}

/** GET /api/businesses/[slug]/locations — list active branches (owner only). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const denied = await guard(slug)
  if (denied) return denied
  const locations = await LocationService.list(slug)
  return NextResponse.json({ locations })
}

/** POST /api/businesses/[slug]/locations — add a branch. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const denied = await guard(slug)
    if (denied) return denied

    const body = await req.json()
    const parsed = createLocationSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const message =
        flat.formErrors[0] ??
        Object.values(flat.fieldErrors).flat()[0] ??
        'Invalid input'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const location = await LocationService.create(slug, parsed.data)

    revalidatePath(`/shop/${slug}`)
    revalidatePath(`/${slug}`)
    revalidatePath(`/dashboard/business/${slug}`)

    return NextResponse.json({ location }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
