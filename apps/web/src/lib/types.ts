export interface Service {
  id: string
  name: string
  description: string
  duration: number // minutes
  price: number // THB
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type OpeningHours = Partial<Record<DayKey, string>> // "HH:MM-HH:MM" or "closed"

export interface Business {
  id: string
  slug: string
  name: string
  category: string
  location: string
  description: string
  coverGradient: [string, string] // CSS gradient from/to (always available, used as fallback)
  coverPhotoUrl: string | null     // optional uploaded cover photo
  photos: string[]                 // additional photos for the gallery
  openingHours: OpeningHours | null
  contactPhone: string | null
  contactWhatsapp: string | null
  contactLine: string | null
  rating: number
  reviewCount: number
  services: Service[]
}

export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'x' | 'other'

export interface Social {
  platform: SocialPlatform
  url: string
}

export interface Creator {
  id: string
  slug: string
  handle: string
  displayName: string
  bio: string
  avatarInitials: string
  avatarColor: string
  socials: Social[]
  linkedBusinessSlugs: string[]
}

export type LinkStatus = 'pending' | 'active' | 'declined'

export interface Link {
  id: string
  creatorSlug: string
  businessSlug: string
  shortCode: string
  contentUrl: string | null
  platform: SocialPlatform | null
  contentThumbnailUrl: string | null
  status: LinkStatus
  clickCount: number
  featuredServiceId: string | null
}

export interface Booking {
  id: string
  serviceId: string
  businessId: string
  linkId?: string
  creatorSlug?: string
  customerName: string
  customerContact: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

export interface TimeSlot {
  time: string
  label: string
  available: boolean
}

// ── Dashboard types ──────────────────────────────────────────────────────────

export interface BookingWithCreator {
  id: string
  serviceName: string
  price: number
  customerName: string
  date: string  // YYYY-MM-DD
  time: string  // HH:MM
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string  // ISO
  creator: {
    slug: string
    handle: string
    displayName: string
  } | null
  isRepeat: boolean
  commissionRate: number | null
  /** If this is a repeat booking, the original creator who acquired the customer. */
  acquiredBy: { handle: string; slug: string } | null
}

export interface CreatorRollup {
  slug: string
  handle: string
  displayName: string
  bookingCount: number
  revenue: number
  earnings: number
}

export interface BusinessDashboardData {
  business: Business
  bookings: BookingWithCreator[]
  stats: {
    totalBookings: number
    totalRevenue: number
    totalCreatorEarnings: number
    totalPlatformFees: number
  }
  creatorRollups: CreatorRollup[]
}

export interface LinkPerformance {
  linkId: string
  business: {
    slug: string
    name: string
    coverGradient: [string, string]
    coverPhotoUrl: string | null
  }
  status: LinkStatus
  contentUrl: string | null
  platform: SocialPlatform | null
  clicks: number
  bookings: number
  earnings: number
  /** Customers acquired through this specific link */
  customersAcquired: number
  /** Acquired customers who have come back at least once */
  customersRebooked: number
}

export interface ActivityEvent {
  id: string
  type: 'click' | 'booking'
  label: string
  amount?: number
  createdAt: string  // ISO
}

export interface CreatorDashboardData {
  creator: Creator
  totals: {
    totalClicks: number
    totalBookings: number
    totalEarnings: number
    pendingPayout: number
    /** Earnings from first-time bookings (10% rate) */
    firstBookingEarnings: number
    /** Earnings from repeat bookings (5% residual) */
    repeatEarnings: number
    /** Distinct customers acquired by this creator */
    customersAcquired: number
    /** Customers still in the 6-month attribution window */
    customersInWindow: number
    /** Total revenue (gross THB) attributed to this creator's customers (first + repeats) */
    lifetimeValue: number
  }
  links: LinkPerformance[]
  recentActivity: ActivityEvent[]
}

// Public-facing affiliation: a creator + their content link to a single business.
export interface BusinessCreatorAffiliation {
  creator: Creator
  link: Link
  totalPlacesRecommended: number
  bookingsDriven: number
}
