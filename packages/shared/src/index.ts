// Shared types and utilities for BRIDGE
// Re-export types used across apps

export type { Business, Creator, Service, Link, Booking, TimeSlot } from './types'

export const PLATFORM_FEE_PERCENT = 0.05   // 5% to BRIDGE
export const CREATOR_FEE_PERCENT = 0.10    // 10% to creator
export const BUSINESS_SHARE_PERCENT = 0.85 // 85% to business

export const SUPPORTED_CURRENCIES = ['THB'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]
