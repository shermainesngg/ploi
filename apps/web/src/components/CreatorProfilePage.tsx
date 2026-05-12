'use client'

import Link from 'next/link'
import { MapPin, Music, Instagram, Youtube, Twitter, Globe, Play } from 'lucide-react'
import type { Creator, Business, Link as LinkRecord, SocialPlatform } from '@/lib/types'
import type { CreatorBusinessLink } from '@/services/creator.service'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

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

function CreatorHero({
  creator,
  placesCount,
}: {
  creator: Creator
  placesCount: number
}) {
  const cityMatch = creator.bio.match(/\b(Bangkok|Chiang Mai|Phuket|Pattaya)\b/i)
  const city = cityMatch ? cityMatch[0] : null

  return (
    <div className="relative overflow-hidden border-b border-bridge-border/30">
      <div className="absolute inset-0 bg-gradient-to-br from-bridge-accent-wash via-white to-bridge-bg" />
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-bridge-accent/[0.03]" />

      <div className="relative px-5 pt-14 pb-10 sm:pt-20 sm:pb-12 max-w-3xl mx-auto">
        <div className="mb-8">
          <span className="font-display text-sm font-bold text-bridge-accent">BRIDGE</span>
        </div>

        <div className="flex items-start gap-5">
          <Avatar
            initials={creator.avatarInitials}
            color={creator.avatarColor}
            size="lg"
            className="w-20 h-20 rounded-2xl text-2xl shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-heading text-bridge-heading leading-tight">{creator.displayName}</h1>
            <p className="text-bridge-accent font-semibold text-label mt-1 mb-3">{creator.handle}</p>
            <p className="text-bridge-muted text-body leading-relaxed max-w-prose">{creator.bio}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <span className="bg-bridge-surface text-bridge-secondary font-semibold text-caption px-3 py-1.5 rounded-badge">
            {placesCount} place{placesCount !== 1 ? 's' : ''} recommended
          </span>
          {city && (
            <span className="bg-bridge-surface text-bridge-secondary font-semibold text-caption px-3 py-1.5 rounded-badge flex items-center gap-1">
              <MapPin size={11} /> {city}-based
            </span>
          )}
        </div>

        {creator.socials.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {creator.socials.map((s) => (
              <a
                key={s.platform + s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-bridge-heading text-white hover:bg-bridge-secondary active:scale-[0.97] transition-all px-3 py-1.5 rounded-badge text-caption font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2"
              >
                <PlatformIcon platform={s.platform} />
                {PlatformLabel(s.platform)}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

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
    <Link
      href={`/${creatorSlug}/${business.slug}`}
      className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2 rounded-card group"
    >
      <Card variant="interactive" className="p-0 overflow-hidden">
        <div className="relative aspect-[4/5]">
          {thumb ? (
            <>
              <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
          )}

          {link.platform && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-micro px-2.5 py-1 rounded-badge flex items-center gap-1">
              <PlatformIcon platform={link.platform} size={9} />
              {PlatformLabel(link.platform)}
            </div>
          )}

          {link.contentUrl && (
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play size={11} className="text-white fill-white ml-0.5" />
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-display text-white font-bold text-base leading-tight drop-shadow-sm line-clamp-2">
              {business.name}
            </h3>
          </div>
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between gap-1">
          <span className="text-micro text-bridge-muted truncate">{business.category}</span>
          {topService && (
            <span className="text-micro text-bridge-accent font-bold flex-shrink-0">
              from ฿{topService.price.toLocaleString()}
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}

export default function CreatorProfilePage({
  creator,
  entries,
}: {
  creator: Creator
  entries: CreatorBusinessLink[]
}) {
  return (
    <div className="min-h-screen bg-bridge-bg">
      <CreatorHero creator={creator} placesCount={entries.length} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10 pb-24">
        <AnimateOnScroll>
          <h2 className="font-display text-title text-bridge-heading mb-6">
            Places I love
          </h2>
        </AnimateOnScroll>

        {entries.length === 0 ? (
          <div className="text-center py-16 text-bridge-muted text-body">No linked businesses yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            {entries.map((e, i) => (
              <AnimateOnScroll key={e.business.id} delay={i * 80}>
                <ContentGridCard
                  business={e.business}
                  link={e.link}
                  creatorSlug={creator.slug}
                />
              </AnimateOnScroll>
            ))}
          </div>
        )}
      </div>

      <div className="text-center pb-12">
        <p className="text-caption text-bridge-muted">
          Powered by <span className="font-display font-bold text-bridge-accent">BRIDGE</span>
        </p>
        <div className="mt-4 flex items-center justify-center gap-6">
          <Link href="/onboard/business" className="text-caption text-bridge-muted hover:text-bridge-text transition-colors cursor-pointer">List your business</Link>
          <Link href="/onboard/creator" className="text-caption text-bridge-muted hover:text-bridge-text transition-colors cursor-pointer">Join as creator</Link>
        </div>
      </div>
    </div>
  )
}
