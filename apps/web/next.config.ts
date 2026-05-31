import type { NextConfig } from 'next'
import path from 'node:path'

// Self-hosted posters live in Supabase Storage; resolve its host for next/image.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  // Pin the workspace root so Next stops picking up stray lockfiles
  outputFileTracingRoot: path.join(__dirname, '../../'),

  images: {
    // next/image owns AVIF/WebP against the ORIGINAL stored poster (PRD §D12).
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Seed cover photos / thumbnails
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Self-hosted posters in Supabase Storage
      ...(supabaseHost ? [{ protocol: 'https' as const, hostname: supabaseHost }] : []),
      // TikTok CDN — dev fallback when Storage self-hosting is unavailable
      { protocol: 'https', hostname: '*.tiktokcdn.com' },
      { protocol: 'https', hostname: '*.tiktokcdn-us.com' },
    ],
  },

  async headers() {
    // CSP: allow only the providers we embed to be framed. Phase 1 = TikTok.
    // Stripe hosts kept for Checkout/Elements. Add youtube-nocookie / instagram
    // in their respective phases (PRD §9).
    const frameSrc = [
      "'self'",
      'https://*.tiktok.com',
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ].join(' ')
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: `frame-src ${frameSrc};` }],
      },
    ]
  },
}

export default nextConfig
