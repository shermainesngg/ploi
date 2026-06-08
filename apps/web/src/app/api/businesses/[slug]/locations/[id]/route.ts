import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { updateLocationSchema } from '@/validation/location.schema'
import { LocationService } from '@/services/location.service'
import { BusinessRepo } from '@/repositories/business.repo'
import { authorizeBusinessDashboard } from '@/lib/ownership'

/**
 * Owner-guard + confirm the location belongs to this business (prevents editing
 * another business's branch by id). Returns a NextResponse on failure.
 */
async function guard(slug: string, locationId: string): Promise<NextResponse | null> {
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
  const [businessId, location] = await Promise.all([
    BusinessRepo.findIdBySlug(slug),
    LocationService.getById(locationId),
  ])
  if (!location || location.businessId !== businessId) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }
  return null
}

/** PATCH /api/businesses/[slug]/locations/[id] — edit a branch. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await params
    const denied = await guard(slug, id)
    if (denied) return denied

    const body = await req.json()
    const parsed = updateLocationSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const message =
        flat.formErrors[0] ??
        Object.values(flat.fieldErrors).flat()[0] ??
        'Invalid input'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    await LocationService.update(id, parsed.data)

    revalidatePath(`/shop/${slug}`)
    revalidatePath(`/${slug}`)
    revalidatePath(`/dashboard/business/${slug}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** DELETE /api/businesses/[slug]/locations/[id] — remove a branch (soft delete). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await params
    const denied = await guard(slug, id)
    if (denied) return denied

    await LocationService.remove(id)

    revalidatePath(`/shop/${slug}`)
    revalidatePath(`/${slug}`)
    revalidatePath(`/dashboard/business/${slug}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
