import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  // Pin the workspace root so Next stops picking up stray lockfiles
  outputFileTracingRoot: path.join(__dirname, '../../'),

  images: {
    remotePatterns: [
      // Allow Unsplash for the seed cover photos / thumbnails
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
}

export default nextConfig
