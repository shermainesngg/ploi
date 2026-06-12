import type {
  Business,
  Creator,
  Location,
  Service,
  Social,
  Link,
  LinkStatus,
  CreatorContent,
  ContentWithCreator,
  Provider,
  MediaKind,
  AspectRatio,
  PosterSource,
  FetchStatus,
  ContentStatus,
} from './types'

const GRADIENTS: Record<string, [string, string]> = {
  'Beauty & Wellness': ['#f43f5e', '#fb923c'],
  'Hair & Barber': ['#8b5cf6', '#ec4899'],
  'Nail & Spa': ['#ec4899', '#f97316'],
  'Fitness & Yoga': ['#3b82f6', '#06b6d4'],
  'Massage & Therapy': ['#10b981', '#3b82f6'],
  'Tattoo & Piercing': ['#111827', '#374151'],
  'Makeup & Styling': ['#f59e0b', '#ef4444'],
}
const DEFAULT_GRADIENT: [string, string] = ['#6366f1', '#8b5cf6']

export function gradientForCategory(cat: string): [string, string] {
  return GRADIENTS[cat] ?? DEFAULT_GRADIENT
}

const AVATAR_COLORS = ['#e11d48', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4']

export function avatarFor(displayName: string, handle: string) {
  const initials = displayName
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const color = AVATAR_COLORS[handle.charCodeAt(1) % AVATAR_COLORS.length]
  return { initials, color }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToService(r: any): Service {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    duration: r.duration,
    price: r.price,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToLocation(r: any): Location {
  const photos: string[] = Array.isArray(r.photos)
    ? r.photos.filter((p: unknown) => typeof p === 'string')
    : []
  return {
    id: r.id,
    businessId: r.business_id,
    name: r.name ?? null,
    address: r.address,
    openingHours: r.opening_hours ?? null,
    contactPhone: r.contact_phone ?? null,
    contactWhatsapp: r.contact_whatsapp ?? null,
    contactLine: r.contact_line ?? null,
    photos,
    isPrimary: r.is_primary ?? false,
    isActive: r.is_active ?? true,
    sortOrder: r.sort_order ?? 0,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToBusiness(r: any): Business {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: Service[] = (r.services ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map(rowToService)

  const seen = new Set<string>()
  const services = all.filter((s) => {
    const key = s.name.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const photos: string[] = Array.isArray(r.photos)
    ? r.photos.filter((p: unknown) => typeof p === 'string')
    : []

  // Locations (if joined). Active only, primary first, then by sort_order.
  const locations: Location[] = Array.isArray(r.locations)
    ? r.locations
        .filter((l: { is_active?: boolean }) => l.is_active !== false)
        .map(rowToLocation)
        .sort((a: Location, b: Location) =>
          a.isPrimary === b.isPrimary ? a.sortOrder - b.sortOrder : a.isPrimary ? -1 : 1,
        )
    : []

  // The primary location is the source of truth for the business's headline
  // address / hours / contacts; fall back to the legacy business columns.
  const primary = locations.find((l) => l.isPrimary) ?? locations[0] ?? null

  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    location: primary?.address ?? r.location,
    description: r.description ?? '',
    coverGradient: gradientForCategory(r.category),
    coverPhotoUrl: r.cover_photo_url ?? null,
    photos,
    openingHours: primary?.openingHours ?? r.opening_hours ?? null,
    contactPhone: primary?.contactPhone ?? r.contact_phone ?? null,
    contactWhatsapp: primary?.contactWhatsapp ?? r.contact_whatsapp ?? null,
    contactLine: primary?.contactLine ?? r.contact_line ?? null,
    rating: Number(r.rating ?? 0),
    reviewCount: r.review_count ?? 0,
    services,
    locations,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToCreator(r: any, linkedBusinessSlugs: string[]): Creator {
  const { initials, color } = avatarFor(r.display_name, r.slug)
  const rawSocials = r.socials
  const socials: Social[] = Array.isArray(rawSocials)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? rawSocials.filter((s: any) => s && s.platform && s.url)
    : []
  return {
    id: r.id,
    slug: r.slug,
    handle: r.handle,
    displayName: r.display_name,
    bio: r.bio ?? '',
    avatarInitials: initials,
    avatarColor: color,
    avatarUrl: r.avatar_url ?? null,
    socials,
    linkedBusinessSlugs,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToCreatorContent(r: any): CreatorContent {
  return {
    id: r.id,
    linkId: r.link_id,
    creatorId: r.creator_id,
    businessId: r.business_id,
    provider: r.provider as Provider,
    contentUrl: r.content_url,
    externalId: r.external_id ?? null,
    urlHash: r.url_hash ?? '',
    mediaKind: (r.media_kind ?? 'video') as MediaKind,
    aspectRatio: (r.aspect_ratio ?? 'vertical') as AspectRatio,
    posterSource: (r.poster_source ?? null) as PosterSource | null,
    posterPath: r.poster_path ?? null,
    caption: r.caption ?? null,
    authorName: r.author_name ?? null,
    fetchStatus: (r.fetch_status ?? 'pending') as FetchStatus,
    attempts: r.attempts ?? 0,
    lastAttemptAt: r.last_attempt_at ?? null,
    posterExpiresAt: r.poster_expires_at ?? null,
    status: (r.status ?? 'pending') as ContentStatus,
    sortOrder: r.sort_order ?? 0,
    clickCount: r.click_count ?? 0,
    createdAt: r.created_at ?? null,
  }
}

// Row with an embedded `creators` resource → card-ready content + creator chip.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToContentWithCreator(r: any): ContentWithCreator | null {
  const c = r.creators
  if (!c) return null
  const { initials, color } = avatarFor(c.display_name, c.slug)
  return {
    content: rowToCreatorContent(r),
    creator: {
      slug: c.slug,
      handle: c.handle,
      displayName: c.display_name,
      avatarInitials: initials,
      avatarColor: color,
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToLink(r: any, creatorSlug: string, businessSlug: string): Link {
  return {
    id: r.id,
    creatorSlug,
    businessSlug,
    shortCode: r.short_code,
    contentUrl: r.content_url ?? null,
    platform: r.platform ?? null,
    contentThumbnailUrl: r.content_thumbnail_url ?? null,
    status: (r.status ?? 'pending') as LinkStatus,
    clickCount: r.click_count ?? 0,
    featuredServiceIds:
      Array.isArray(r.featured_service_ids) && r.featured_service_ids.length > 0
        ? r.featured_service_ids
        : r.featured_service_id
          ? [r.featured_service_id]
          : [],
  }
}
