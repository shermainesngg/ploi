'use client'

import Link from 'next/link'
import { MapPin, Music, Instagram, Youtube, Twitter, Globe, Play } from 'lucide-react'
import type { Creator, Business, Link as LinkRecord, SocialPlatform } from '@/lib/types'
import type { CreatorBusinessLink } from '@/lib/db'

function PlatformIcon({ platform, size = 14 }: { platform: SocialPlatform; size?: number }) {
  switch (platform) {
    case 'tiktok': return <Music size={size} />
    case 'instagram': return <Instagram size={size} />
    case 'youtube': return <Youtube size={size} />
    case 'x': return <Twitter size={size} />
    default: return <Globe size={size} />
  }
}

function PlatformLabel(p: SocialPlatform) {
  return p === 'x' ? 'X' : p.charAt(0).toUpperCase() + p.slice(1)
}

// ── Creator hero ──────────────────────────────────────────────────────────────

function CreatorHero({
  creator,
  placesCount,
}: {
  creator: Creator
  placesCount: number
}) {
  // Try to detect a city in the bio for "Bangkok-based" stat
  const cityMatch = creator.bio.match(/\b(Bangkok|Chiang Mai|Phuket|Pattaya)\b/i)
  const city = cityMatch ? cityMatch[0] : null

  return (
    <div className="px-5 pt-14 pb-6 bg-white border-b border-stone-100">
      <div className="mb-6">
        <span className="text-xs font-black tracking-tight text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">BRIDGE</span>
      </div>

      <div className="flex items-start gap-4">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow-sm"
          style={{ backgroundColor: creator.avatarColor }}
        >
          {creator.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-stone-900 leading-tight">{creator.displayName}</h1>
          <p className="text-rose-600 font-semibold text-sm mt-0.5 mb-2">{creator.handle}</p>
          <p className="text-stone-500 text-sm leading-relaxed">{creator.bio}</p>
        </div>
      </div>

      {/* Public stats */}
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
        <span className="bg-stone-100 text-stone-700 font-semibold px-3 py-1.5 rounded-full">
          {placesCount} place{placesCount !== 1 ? 's' : ''} recommended
        </span>
        {city && (
          <span className="bg-stone-100 text-stone-700 font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
            <MapPin size={11} /> {city}-based
          </span>
        )}
      </div>

      {/* Socials */}
      {creator.socials.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {creator.socials.map((s) => (
            <a
              key={s.platform + s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-stone-900 text-white hover:bg-stone-800 active:scale-95 transition-all px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              <PlatformIcon platform={s.platform} />
              {PlatformLabel(s.platform)}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Content grid card ─────────────────────────────────────────────────────────

function ContentGridCard({
  business,
  link,
  creatorSlug,
}: {
  business: Business
  link: LinkRecord
  creatorSlug: string
}) {
  const [from, to] = business.coverGradient
  const thumb = link.contentThumbnailUrl ?? business.coverPhotoUrl
  const topService = business.services[0]

  return (
    <Link href={`/${creatorSlug}/${business.slug}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
        {/* Thumbnail (square, TikTok grid feel) */}
        <div className="relative aspect-square">
          {thumb ? (
            <>
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
          )}

          {/* Platform badge */}
          {link.platform && (
            <div className="absolute top-2 left-2 bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <PlatformIcon platform={link.platform} size={9} />
              {PlatformLabel(link.platform)}
            </div>
          )}

          {/* Play indicator for video content */}
          {link.contentUrl && (
            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
              <Play size={11} className="text-white fill-white ml-0.5" />
            </div>
          )}

          {/* Bottom name overlay */}
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">
              {business.name}
            </h3>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-2.5 py-2 flex items-center justify-between gap-1">
          <span className="text-[10px] text-stone-400 truncate">{business.category}</span>
          {topService && (
            <span className="text-[10px] text-rose-600 font-bold flex-shrink-0">
              from ฿{topService.price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CreatorProfilePage({
  creator,
  entries,
}: {
  creator: Creator
  entries: CreatorBusinessLink[]
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[480px] mx-auto">
        <CreatorHero creator={creator} placesCount={entries.length} />

        <div className="px-4 mt-6 pb-24">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">
            Places I love
          </h2>

          {entries.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-sm">No linked businesses yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {entries.map((e) => (
                <ContentGridCard
                  key={e.business.id}
                  business={e.business}
                  link={e.link}
                  creatorSlug={creator.slug}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-10">
          <p className="text-xs text-stone-400">Powered by <span className="font-black text-rose-600">BRIDGE</span></p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Link href="/onboard/business" className="text-xs text-stone-400 hover:text-stone-600">List your business</Link>
            <span className="text-stone-300">·</span>
            <Link href="/onboard/creator" className="text-xs text-stone-400 hover:text-stone-600">Join as creator</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
