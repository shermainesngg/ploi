// Canonical domain types shared across BRIDGE apps

export interface Service {
  id: string
  name: string
  description: string
  duration: number  // minutes
  price: number     // THB
}

export interface Business {
  id: string
  slug: string
  name: string
  category: string
  location: string
  description: string
  coverGradient: [string, string]
  rating: number
  reviewCount: number
  services: Service[]
}

export interface Creator {
  id: string
  slug: string
  handle: string
  displayName: string
  bio: string
  avatarInitials: string
  avatarColor: string
  linkedBusinessSlugs: string[]
}

export interface Link {
  id: string
  creatorSlug: string
  businessSlug: string
  shortCode: string
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

export interface AttributionEvent {
  id: string
  linkId: string
  bookingId?: string
  eventType: 'click' | 'booking_started' | 'booking_confirmed'
  createdAt: string
}
