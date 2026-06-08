// Slugs that would shadow a top-level route (`/[creator]`) or are otherwise
// reserved. A creator handle resolving to one of these is rejected at signup.
// Keep in sync with the top-level directories under `app/`.
export const RESERVED_SLUGS = new Set<string>([
  // Existing top-level routes
  'api', 'auth', 'booking-confirmed', 'bookings', 'dashboard', 'dev',
  'login', 'onboard', 'reset-password', 'search', 'shop', 'signup', 'staff',
  // Reserved for future use / common conflicts
  'b', 'business', 'businesses', 'creator', 'creators', 'admin', 'settings',
  'account', 'help', 'support', 'about', 'terms', 'privacy', 'pricing',
  'explore', 'home', 'app', 'static', '_next', 'public', 'favicon',
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}

// Commission split constants — kept in sync with packages/shared
export const PLATFORM_FEE_PERCENT = 0.05   // 5% to PLOI
export const CREATOR_FEE_PERCENT = 0.10    // 10% to creator
export const BUSINESS_SHARE_PERCENT = 0.85 // 85% to business

export function calculateCreatorEarnings(price: number) {
  return Math.round(price * CREATOR_FEE_PERCENT)
}

export function calculatePlatformFee(price: number) {
  return Math.round(price * PLATFORM_FEE_PERCENT)
}

export function calculateBusinessShare(price: number) {
  return Math.round(price * BUSINESS_SHARE_PERCENT)
}
