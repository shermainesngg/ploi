import Stripe from 'stripe'

export function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY
}

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe not configured. Set STRIPE_SECRET_KEY in .env.local.')
  }
  if (cached) return cached
  cached = new Stripe(process.env.STRIPE_SECRET_KEY)
  return cached
}

export const PLATFORM_FEE_PERCENT = 0.05  // 5% to BRIDGE

export function calculatePlatformFee(amountCents: number) {
  return Math.round(amountCents * PLATFORM_FEE_PERCENT)
}
