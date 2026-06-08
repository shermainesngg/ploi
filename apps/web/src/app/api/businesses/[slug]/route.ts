import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { updateBusinessSchema } from '@/validation/business.schema'
import { BusinessService } from '@/services/business.service'
import { authorizeBusinessDashboard } from '@/lib/ownership'

/**
 * PATCH /api/businesses/[slug] — update profile settings from the dashboard.
 * Owner-only (unclaimed/demo businesses stay open, same rule as the dashboard).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params

    const access = await authorizeBusinessDashboard(slug)
    if (access === 'not_found') {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    if (access !== 'granted') {
      return NextResponse.json(
        { error: 'Not authorized to edit this business' },
        { status: access === 'unauthenticated' ? 401 : 403 },
      )
    }

    const body = await req.json()
    const parsed = updateBusinessSchema.safeParse(body)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const message =
        flat.formErrors[0] ??
        Object.values(flat.fieldErrors).flat()[0] ??
        'Invalid input'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    await BusinessService.updateSettings(slug, parsed.data)

    // Refresh every surface that renders this business.
    revalidatePath(`/shop/${slug}`)
    revalidatePath(`/${slug}`)
    revalidatePath(`/dashboard/business/${slug}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
