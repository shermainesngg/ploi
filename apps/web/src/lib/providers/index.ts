import type { Provider } from '@/lib/types'
import type { ProviderAdapter } from './types'
import { tiktokAdapter } from './tiktok'

// Registry — ordered; first matching adapter wins. Phase 2/3 append youtube/instagram.
const ADAPTERS: ProviderAdapter[] = [tiktokAdapter]

const BY_ID = new Map<Provider, ProviderAdapter>(ADAPTERS.map((a) => [a.id, a]))

/** Resolve the adapter that owns a URL (null if no provider matches). */
export function adapterForUrl(url: string): ProviderAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null
}

/** Resolve an adapter by provider id (e.g. when re-processing a stored row). */
export function adapterForProvider(provider: Provider): ProviderAdapter | null {
  return BY_ID.get(provider) ?? null
}

export type { ProviderAdapter, ProviderMeta } from './types'
export { ADAPTERS }
