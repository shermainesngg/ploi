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
