import type { Business, Creator, Link } from './types'

export const businesses: Record<string, Business> = {
  glowstudio: {
    id: 'biz_001',
    slug: 'glowstudio',
    name: 'Glow Studio Bangkok',
    category: 'Beauty & Wellness',
    location: 'Sukhumvit Soi 24, Bangkok',
    description:
      'Bangkok\'s premier glow destination. Specialist facials and skin treatments by certified aestheticians.',
    coverGradient: ['#f43f5e', '#fb923c'],
    coverPhotoUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
    photos: [
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
    ],
    openingHours: {
      mon: '10:00-20:00',
      tue: '10:00-20:00',
      wed: '10:00-20:00',
      thu: '10:00-20:00',
      fri: '10:00-21:00',
      sat: '09:00-21:00',
      sun: '10:00-19:00',
    },
    contactPhone: '+66 2 123 4567',
    contactWhatsapp: '+66891234567',
    contactLine: '@glowstudiobkk',
    rating: 4.9,
    reviewCount: 127,
    services: [
      {
        id: 'svc_001',
        name: 'Signature Glow Facial',
        description:
          'Our hero treatment. Deep cleanse, extraction, customised serum, LED therapy. The full glow package.',
        duration: 60,
        price: 1800,
      },
      {
        id: 'svc_002',
        name: 'Deep Cleanse Facial',
        description:
          'Thorough pore cleanse with steam, enzyme exfoliation, and calming mask. Perfect for congested skin.',
        duration: 45,
        price: 1200,
      },
      {
        id: 'svc_003',
        name: 'Hydra Boost Treatment',
        description:
          'Intensive hydration therapy with hyaluronic acid infusion and barrier-repair mask. Dewy skin guaranteed.',
        duration: 75,
        price: 2500,
      },
      {
        id: 'svc_004',
        name: 'Express Glow-Up',
        description:
          'Quick-fix radiance boost. Brightening peel + vitamin C serum. Perfect before a night out.',
        duration: 30,
        price: 800,
      },
      {
        id: 'svc_005',
        name: 'LED Light Therapy Add-On',
        description:
          'Red & near-infrared light therapy to boost collagen and calm inflammation. Add to any facial.',
        duration: 20,
        price: 500,
      },
    ],
  },
}

export const creators: Record<string, Creator> = {
  glowwithsara: {
    id: 'cre_001',
    slug: 'glowwithsara',
    handle: '@glowwithsara',
    displayName: 'Sara Chen',
    bio: "Bangkok beauty & wellness explorer. Finding the city's best-kept glow-ups so you don't have to.",
    avatarInitials: 'SC',
    avatarColor: '#e11d48',
    socials: [
      { platform: 'tiktok', url: 'https://www.tiktok.com/@glowwithsara' },
      { platform: 'instagram', url: 'https://www.instagram.com/glowwithsara' },
    ],
    linkedBusinessSlugs: ['glowstudio'],
  },
}

export const links: Link[] = [
  {
    id: 'lnk_001',
    creatorSlug: 'glowwithsara',
    businessSlug: 'glowstudio',
    shortCode: 'glowwithsara/glowstudio',
    contentUrl: 'https://www.tiktok.com/@glowwithsara/video/7298765432109876543',
    platform: 'tiktok',
    contentThumbnailUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
    status: 'active',
    clickCount: 1247,
    featuredServiceId: 'svc_001',
  },
]

export function getPageData(creatorSlug: string, businessSlug: string) {
  const business = businesses[businessSlug] ?? null
  const creator = creators[creatorSlug] ?? null
  const link = links.find(
    (l) => l.creatorSlug === creatorSlug && l.businessSlug === businessSlug,
  ) ?? null

  return { business, creator, link }
}

export function generateTimeSlots(durationMinutes: number): {
  label: string
  slots: { time: string; available: boolean }[]
}[] {
  const sessions = [
    { label: 'Morning', startHour: 9, endHour: 12 },
    { label: 'Afternoon', startHour: 13, endHour: 17 },
    { label: 'Evening', startHour: 18, endHour: 20 },
  ]

  // Simulate some unavailable slots
  const unavailable = new Set(['10:00', '13:30', '18:00'])

  return sessions.map(({ label, startHour, endHour }) => {
    const slots: { time: string; available: boolean }[] = []
    for (let h = startHour; h < endHour; h++) {
      for (const m of [0, 30]) {
        // Skip if slot + duration would exceed session end
        const totalMinutes = h * 60 + m + durationMinutes
        if (totalMinutes > endHour * 60) continue
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        slots.push({ time: timeStr, available: !unavailable.has(timeStr) })
      }
    }
    return { label, slots }
  })
}

export function getUpcomingDates(count = 7): Date[] {
  const dates: Date[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}
