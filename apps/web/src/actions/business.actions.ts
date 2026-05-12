'use server'

import { createBusinessSchema } from '@/validation/business.schema'
import { BusinessService } from '@/services/business.service'

export async function createBusiness(formData: FormData) {
  const raw = Object.fromEntries(formData)

  let services: Array<{ name: string; description: string; duration: number; price: number }> = []
  const servicesJson = raw.services
  if (typeof servicesJson === 'string') {
    try { services = JSON.parse(servicesJson) } catch { /* empty */ }
  }

  let photos: string[] = []
  const photosJson = raw.photos
  if (typeof photosJson === 'string') {
    try { photos = JSON.parse(photosJson) } catch { /* empty */ }
  }

  let openingHours: Record<string, string> | undefined
  const ohJson = raw.openingHours
  if (typeof ohJson === 'string') {
    try { openingHours = JSON.parse(ohJson) } catch { /* empty */ }
  }

  const parsed = createBusinessSchema.safeParse({
    ...raw,
    services,
    photos,
    openingHours,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { name, category, location, description, email, contactPhone, contactWhatsapp, contactLine } = parsed.data

  if (!contactPhone && !contactWhatsapp && !contactLine) {
    return { error: { contactPhone: ['At least one contact method is required.'] } }
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)

  try {
    const result = await BusinessService.create({
      slug,
      name,
      category,
      location,
      description,
      email: email && email.trim() ? email.trim() : undefined,
      services: parsed.data.services,
      openingHours,
      contactPhone: contactPhone || undefined,
      contactWhatsapp: contactWhatsapp || undefined,
      contactLine: contactLine || undefined,
      photos,
    })
    return { success: true, slug: result.slug, id: result.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create business' }
  }
}
