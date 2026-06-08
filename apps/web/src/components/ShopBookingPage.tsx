'use client'

import { useState, useEffect, useRef } from 'react'
import NextLink from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Clock,
  Star,
  X,
  ChevronRight,
  Check,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Phone,
  MessageCircle,
  ChevronDown,
  Users,
  Music,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Play,
  TrendingUp,
  Zap,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PoweredByPloi } from '@/components/ui/Logo'
import type {
  Business,
  Creator,
  Service,
  Link as LinkRecord,
  BusinessCreatorAffiliation,
  ContentWithCreator,
  SocialPlatform,
  DayKey,
} from '@/lib/types'
import { ContentCarousel, lastTappedVideoKey } from '@/components/ContentCarousel'
import { getUpcomingDates } from '@/lib/seed-data'

interface AvailabilityResult {
  date: string
  closed: boolean
  hours: string | null
  groups: Array<{ label: string; slots: Array<{ time: string; available: boolean; reason?: string }> }>
}

interface Props {
  business: Business
  creator: Creator | null
  link: LinkRecord | null
  affiliations: BusinessCreatorAffiliation[]
  content: ContentWithCreator[]
  recentBookings: number
  /** Signed-in user owns this business — show the dashboard shortcut bar. */
  isOwner?: boolean
}

// ── Creator content wall (swimlane of facade cards → bottom-sheet player) ─────

function ContentWall({ content }: { content: ContentWithCreator[] }) {
  if (content.length === 0) return null
  return (
    <div className="px-4 mt-6">
      <h2 className="text-sm font-semibold text-bridge-muted uppercase tracking-widest mb-3">
        Creator content
      </h2>
      <ContentCarousel items={content} />
    </div>
  )
}

type Step = 'services' | 'date' | 'time' | 'details' | 'confirmed'

interface BookingStaff {
  id: string
  name: string
  role: string | null
  photoUrl: string | null
  locationId: string | null
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function formatPrice(thb: number) {
  return `฿${thb.toLocaleString()}`
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function PlatformIcon({ platform, size = 12 }: { platform: SocialPlatform; size?: number }) {
  switch (platform) {
    case 'tiktok': return <Music size={size} />
    case 'instagram': return <Instagram size={size} />
    case 'youtube': return <Youtube size={size} />
    case 'x': return <Twitter size={size} />
    default: return <Globe size={size} />
  }
}

function platformLabel(p: SocialPlatform) {
  return p === 'x' ? 'X' : p.charAt(0).toUpperCase() + p.slice(1)
}

// ── Hero header ──────────────────────────────────────────────────────────────

function BusinessHero({
  business,
  recentBookings,
  affiliationsCount,
}: {
  business: Business
  recentBookings: number
  affiliationsCount: number
}) {
  const hasPhoto = !!business.coverPhotoUrl
  const fromPrice = business.services.length
    ? Math.min(...business.services.map((s) => s.price))
    : null

  return (
    <div className="relative">
      {hasPhoto ? (
        <div className="absolute inset-0">
          <img src={business.coverPhotoUrl!} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/70" />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--bridge-hero-gradient)' }} />
      )}

      <div className="relative px-5 pt-14 pb-8">
        <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 backdrop-blur-sm">
          {business.category}
        </span>
        <h1 className="text-3xl font-bold text-white leading-tight mb-2">{business.name}</h1>
        <div className="flex items-center gap-1.5 text-white/85 text-sm">
          <MapPin size={14} />
          <span>{business.location}</span>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-white/85 text-sm">
            <Star size={14} className="fill-white/85" />
            <span className="font-semibold text-white">{business.rating}</span>
            <span>· {business.reviewCount} reviews</span>
          </div>
          {fromPrice !== null && (
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              from ฿{fromPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Trust signals — Klook-style bold pill badges, creators first (PLOI differentiator) */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {affiliationsCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-white/25 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <Users size={12} />
              {affiliationsCount} creator{affiliationsCount !== 1 ? 's' : ''} recommend
            </span>
          )}
          {recentBookings > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-white/25 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <TrendingUp size={12} />
              {recentBookings > 10 ? `Popular · ${recentBookings} booked` : `${recentBookings} booked this week`}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 bg-white/25 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            <Zap size={12} />
            Instant Booking
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Creator attribution bar ───────────────────────────────────────────────────

function CreatorBar({ creator, link }: { creator: Creator; link: LinkRecord | null }) {
  const inner = (
    <div className="mx-4 -mt-3 relative z-10 bg-bridge-card rounded-2xl shadow-sm border border-bridge-border/60 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: creator.avatarColor }}
        >
          {creator.avatarInitials}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-bridge-muted leading-none mb-0.5">Recommended by</p>
          <p className="text-sm font-semibold text-bridge-text leading-none truncate">{creator.handle}</p>
          {link?.contentUrl && (
            <p className="text-[10px] text-bridge-accent mt-1 flex items-center gap-1">
              <ExternalLink size={10} />
              <span className="truncate">Watch the {link.platform ?? 'post'}</span>
            </p>
          )}
        </div>
      </div>
      {link?.contentUrl && (
        <ChevronRight size={16} className="text-bridge-muted flex-shrink-0" />
      )}
    </div>
  )
  if (link?.contentUrl) {
    return (
      <a href={link.contentUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity cursor-pointer">
        {inner}
      </a>
    )
  }
  return inner
}

// ── Photo gallery ─────────────────────────────────────────────────────────────

function PhotoGallery({ photos, onOpen }: { photos: string[]; onOpen: (i: number) => void }) {
  if (photos.length <= 1) return null
  return (
    <div className="px-4 mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={() => onOpen(i)}
            className="flex-shrink-0 w-28 h-20 rounded-2xl overflow-hidden snap-start active:scale-95 transition-transform"
          >
            <img src={p} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

function PhotoLightbox({
  photos, index, onClose,
}: {
  photos: string[]
  index: number
  onClose: () => void
}) {
  const [i, setI] = useState(index)
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
      >
        <X size={18} />
      </button>
      <img src={photos[i]} alt="" className="max-w-full max-h-full object-contain" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {photos.map((_, n) => (
          <button
            key={n}
            onClick={(e) => { e.stopPropagation(); setI(n) }}
            className={`w-2 h-2 rounded-full ${n === i ? 'bg-bridge-card' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── About / details collapsible ──────────────────────────────────────────────

function todayKey(): DayKey {
  const day = new Date().getDay()  // 0 = Sun
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[day]
}

function isOpenNow(hours: string): boolean {
  if (!hours || hours === 'closed') return false
  const [start, end] = hours.split('-')
  if (!start || !end) return false
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return cur >= sh * 60 + sm && cur <= eh * 60 + em
}

function AboutSection({ business }: { business: Business }) {
  const [open, setOpen] = useState(false)
  const today = todayKey()
  const todayHours = business.openingHours?.[today]
  const openNow = todayHours ? isOpenNow(todayHours) : null

  const hasContact = business.contactPhone || business.contactWhatsapp || business.contactLine
  const hasHours = business.openingHours && Object.keys(business.openingHours).length > 0

  if (!business.description && !hasContact && !hasHours) return null

  return (
    <div className="px-4 mt-6">
      <div className="bg-bridge-card rounded-2xl border border-bridge-border/60 overflow-hidden">
        {business.description && (
          <p className={`px-4 pt-3.5 text-bridge-secondary text-sm leading-relaxed ${open ? '' : 'line-clamp-2'}`}>{business.description}</p>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-3 flex items-center justify-between active:bg-bridge-surface transition-colors"
        >
          <div className="flex items-center gap-3 text-left">
            {hasHours && todayHours && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                openNow ? 'bg-green-50 text-green-700' : 'bg-bridge-surface text-bridge-muted'
              }`}>
                {openNow ? 'Open now' : 'Closed'}
              </span>
            )}
            <span className="text-sm font-semibold text-bridge-text">{open ? 'About this place' : 'Hours, location & contact'}</span>
          </div>
          <ChevronDown size={16} className={`text-bridge-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="border-t border-bridge-border/60 px-4 py-4 space-y-4">
            {/* Hours */}
            {hasHours && (
              <div>
                <p className="text-xs font-semibold text-bridge-muted uppercase tracking-wide mb-2">Hours</p>
                <div className="space-y-1 text-sm">
                  {DAY_ORDER.map((d) => {
                    const h = business.openingHours?.[d]
                    const isToday = d === today
                    return (
                      <div key={d} className={`flex justify-between ${isToday ? 'font-semibold text-bridge-heading' : 'text-bridge-secondary'}`}>
                        <span>{DAY_LABELS[d]}{isToday && ' (today)'}</span>
                        <span>{h && h !== 'closed' ? h : 'Closed'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Location(s) */}
            <div>
              <p className="text-xs font-semibold text-bridge-muted uppercase tracking-wide mb-2">
                {business.locations.length > 1 ? `Locations (${business.locations.length})` : 'Location'}
              </p>
              {business.locations.length > 1 ? (
                <div className="space-y-3">
                  {business.locations.map((loc) => (
                    <div key={loc.id}>
                      {loc.name && <p className="text-sm font-semibold text-bridge-heading">{loc.name}</p>}
                      <p className="text-sm text-bridge-secondary mb-1">{loc.address}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address + ' ' + business.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-bridge-accent text-xs font-semibold hover:underline"
                      >
                        <MapPin size={12} /> Open in Google Maps
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-sm text-bridge-secondary mb-2">{business.location}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location + ' ' + business.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-bridge-accent text-sm font-semibold hover:underline"
                  >
                    <MapPin size={13} /> Open in Google Maps
                  </a>
                </>
              )}
            </div>

            {/* Contact */}
            {hasContact && (
              <div>
                <p className="text-xs font-semibold text-bridge-muted uppercase tracking-wide mb-2">Contact</p>
                <div className="space-y-2">
                  {business.contactPhone && (
                    <a
                      href={`tel:${business.contactPhone.replace(/\s+/g, '')}`}
                      className="flex items-center gap-2 text-sm text-bridge-text font-medium"
                    >
                      <Phone size={13} className="text-bridge-muted" />
                      {business.contactPhone}
                    </a>
                  )}
                  {business.contactWhatsapp && (
                    <a
                      href={`https://wa.me/${business.contactWhatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-700 font-medium"
                    >
                      <MessageCircle size={13} />
                      WhatsApp
                    </a>
                  )}
                  {business.contactLine && (
                    <a
                      href={`https://line.me/ti/p/~${business.contactLine.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-bridge-text font-medium"
                    >
                      <MessageCircle size={13} className="text-bridge-muted" />
                      LINE: {business.contactLine}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Creators callout (Instagram-style stacked avatars) ───────────────────────

function CreatorsCallout({
  affiliations,
  business,
}: {
  affiliations: BusinessCreatorAffiliation[]
  business: Business
}) {
  const [selected, setSelected] = useState<BusinessCreatorAffiliation | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (affiliations.length === 0) return null

  const visibleAvatars = affiliations.slice(0, 4)
  const overflow = Math.max(0, affiliations.length - visibleAvatars.length)
  const count = affiliations.length

  return (
    <>
      <div className="px-4 mt-4">
        <button
          onClick={() => setShowAll(true)}
          className="w-full bg-bridge-card rounded-2xl border border-bridge-border/60 shadow-sm hover:shadow-md active:scale-[0.99] transition-all overflow-hidden group"
        >
          <div className="px-4 py-3.5 flex items-center gap-3">
            {/* Stacked avatars */}
            <div className="flex-shrink-0 flex items-center">
              {visibleAvatars.map((a, i) => (
                <div
                  key={a.creator.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ring-[3px] ring-white relative"
                  style={{
                    backgroundColor: a.creator.avatarColor,
                    marginLeft: i === 0 ? 0 : '-12px',
                    zIndex: visibleAvatars.length - i,
                  }}
                >
                  {a.creator.avatarInitials}
                </div>
              ))}
              {overflow > 0 && (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-bridge-secondary text-[11px] font-bold bg-bridge-surface ring-[3px] ring-white"
                  style={{ marginLeft: '-12px', zIndex: 0 }}
                >
                  +{overflow}
                </div>
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-bridge-heading leading-tight">
                {count === 1 ? '1 creator' : `${count} creators`}{' '}
                <span className="font-medium text-bridge-muted">recommend{count === 1 ? 's' : ''} this place</span>
              </p>
              <p className="text-[11px] text-bridge-muted mt-0.5 flex items-center gap-1">
                <Users size={11} />
                <span>Tap to see their content</span>
              </p>
            </div>

            <ChevronRight size={18} className="text-bridge-border-strong flex-shrink-0 group-hover:text-bridge-accent transition-colors" />
          </div>

          {/* Optional: thin gradient strip at bottom for visual flourish */}
          <div className="h-1 bg-gradient-to-r from-bridge-accent via-bridge-accent-light to-bridge-accent" />
        </button>
      </div>

      {selected && (
        <CreatorDetailModal
          affiliation={selected}
          business={business}
          onClose={() => setSelected(null)}
        />
      )}

      {showAll && (
        <AllCreatorsSheet
          affiliations={affiliations}
          business={business}
          onClose={() => setShowAll(false)}
          onSelect={(a) => {
            setShowAll(false)
            setSelected(a)
          }}
        />
      )}
    </>
  )
}

function CreatorDetailModal({
  affiliation,
  business,
  onClose,
}: {
  affiliation: BusinessCreatorAffiliation
  business: Business
  onClose: () => void
}) {
  const { creator, link } = affiliation

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-2xl bg-bridge-card rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto animate-scale-in pointer-events-auto">
          {/* Close */}
          <div className="flex justify-end p-4 pb-0">
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-bridge-surface hover:bg-bridge-surface"
            >
              <X size={16} className="text-bridge-secondary" />
            </button>
          </div>

          {/* Creator header */}
          <div className="px-5 pt-2 pb-5">
            <div className="flex items-start gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                style={{ backgroundColor: creator.avatarColor }}
              >
                {creator.avatarInitials}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-bold text-bridge-heading text-lg leading-tight">{creator.displayName}</h3>
                <p className="text-bridge-accent font-semibold text-sm">{creator.handle}</p>
                <p className="text-bridge-muted text-xs mt-1">
                  Has recommended {affiliation.totalPlacesRecommended} place{affiliation.totalPlacesRecommended !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {creator.bio && (
              <p className="text-bridge-secondary text-sm leading-relaxed mt-3">{creator.bio}</p>
            )}

            {/* Socials */}
            {creator.socials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {creator.socials.map((s) => (
                  <a
                    key={s.platform + s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-bridge-surface hover:bg-bridge-surface px-3 py-1.5 rounded-full text-bridge-text text-xs font-semibold"
                  >
                    <PlatformIcon platform={s.platform} />
                    {platformLabel(s.platform)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          {link.contentUrl && (
            <div className="px-5 pb-5">
              <p className="text-xs font-semibold text-bridge-muted uppercase tracking-wide mb-2">
                Their content about {business.name}
              </p>
              <a
                href={link.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative aspect-video rounded-2xl overflow-hidden bg-bridge-border group"
              >
                {link.contentThumbnailUrl ? (
                  <>
                    <img src={link.contentThumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10" />
                  </>
                ) : (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${business.coverGradient[0]}, ${business.coverGradient[1]})` }} />
                )}

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={20} className="text-bridge-accent fill-bridge-accent ml-0.5" />
                  </div>
                </div>

                {/* Platform badge */}
                {link.platform && (
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    <PlatformIcon platform={link.platform} size={10} />
                    {platformLabel(link.platform)}
                  </div>
                )}

                <div className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <ExternalLink size={9} />
                  Watch
                </div>
              </a>
            </div>
          )}

          {/* Action */}
          <div className="px-5 pb-6">
            <NextLink
              href={`/${creator.slug}`}
              className="block w-full py-3 rounded-2xl bg-bridge-ink text-bridge-ink-foreground text-center font-semibold text-sm hover:bg-bridge-ink-hover transition-all"
            >
              View full profile →
            </NextLink>
          </div>
        </div>
      </div>
    </>
  )
}

function AllCreatorsSheet({
  affiliations,
  business,
  onClose,
  onSelect,
}: {
  affiliations: BusinessCreatorAffiliation[]
  business: Business
  onClose: () => void
  onSelect: (a: BusinessCreatorAffiliation) => void
}) {
  const [sortBy, setSortBy] = useState<'bookings' | 'recent'>('bookings')

  const sorted = [...affiliations].sort((a, b) => {
    if (sortBy === 'bookings') return b.bookingsDriven - a.bookingsDriven
    return 0  // server already returns recent-first
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 max-w-2xl mx-auto animate-slide-up flex flex-col bg-bridge-bg">
        {/* Header */}
        <div className="bg-bridge-card px-5 py-4 border-b border-bridge-border/60 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-bridge-heading text-base">All creators</h3>
            <p className="text-xs text-bridge-muted">{affiliations.length} recommend {business.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-bridge-surface hover:bg-bridge-surface"
          >
            <X size={16} className="text-bridge-secondary" />
          </button>
        </div>

        {/* Sort */}
        <div className="bg-bridge-card px-5 py-2 border-b border-bridge-border/60 flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-bridge-muted">Sort:</span>
          {(['bookings', 'recent'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                sortBy === s ? 'bg-bridge-accent text-white' : 'bg-bridge-surface text-bridge-secondary'
              }`}
            >
              {s === 'bookings' ? 'Most bookings' : 'Most recent'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sorted.map((a) => (
            <button
              key={a.creator.id}
              onClick={() => onSelect(a)}
              className="w-full text-left bg-bridge-card rounded-2xl border border-bridge-border/60 overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
            >
              {/* Content thumbnail */}
              {a.link.contentThumbnailUrl && (
                <div className="relative aspect-video">
                  <img src={a.link.contentThumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {a.link.platform && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                      <PlatformIcon platform={a.link.platform} size={10} />
                      {platformLabel(a.link.platform)}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                  style={{ backgroundColor: a.creator.avatarColor }}
                >
                  {a.creator.avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-bridge-heading text-sm truncate">{a.creator.handle}</p>
                  <p className="text-bridge-muted text-xs truncate">{a.creator.displayName}</p>
                  <p className="text-[11px] text-bridge-muted mt-0.5">
                    {a.totalPlacesRecommended} places · {a.bookingsDriven} bookings driven
                  </p>
                </div>
                {a.link.contentUrl && (
                  <span className="flex-shrink-0 text-xs font-semibold text-bridge-accent bg-bridge-accent-wash px-2.5 py-1.5 rounded-lg">
                    View
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onBook,
  isPopular,
}: {
  service: Service
  onBook: (service: Service) => void
  isPopular?: boolean
}) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        {isPopular && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bridge-accent bg-bridge-accent-wash px-2 py-0.5 rounded-full mb-1.5">
            <Sparkles size={10} /> Most popular
          </span>
        )}
        <h3 className="font-semibold text-bridge-heading text-base leading-snug mb-1">{service.name}</h3>
        <p className="text-bridge-muted text-sm leading-relaxed line-clamp-2 mb-3">{service.description}</p>
        <div className="flex items-center gap-3 text-bridge-muted text-xs">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(service.duration)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className="font-data text-bridge-heading font-bold text-xl leading-none tracking-tight">{formatPrice(service.price)}</span>
        <Button size="sm" variant="book" onClick={() => onBook(service)} className="cursor-pointer">
          Book
        </Button>
      </div>
    </Card>
  )
}

// ── Featured service card (content-first hero) ──────────────────────────────

function FeaturedServiceCard({
  service, business, creator, link, onBook,
}: {
  service: Service
  business: Business
  creator: Creator
  link: LinkRecord | null
  onBook: (service: Service) => void
}) {
  const thumbnail = link?.contentThumbnailUrl
  return (
    <div className="px-4 mt-5">
      <p className="text-[11px] font-bold text-bridge-accent uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
        <Sparkles size={12} /> {creator.handle} recommends this for you
      </p>

      <div className="relative bg-bridge-card rounded-3xl shadow-lg border-2 border-bridge-accent-light overflow-hidden">
        {/* Content thumbnail header */}
        {thumbnail && link?.contentUrl && (
          <a
            href={link.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative aspect-video group"
          >
            <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play size={20} className="text-bridge-accent fill-bridge-accent ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              Watch {creator.handle}&apos;s review
            </div>
          </a>
        )}

        {/* Service card body */}
        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ring-4 ring-bridge-accent-soft"
              style={{ backgroundColor: creator.avatarColor }}
            >
              {creator.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-bridge-muted">
                {creator.displayName} got the
              </p>
              <h3 className="font-bold text-bridge-heading text-lg leading-tight mt-0.5">
                {service.name}
              </h3>
            </div>
          </div>

          <p className="text-bridge-secondary text-sm leading-relaxed mb-4">{service.description}</p>

          <div className="flex items-center gap-3 mb-4 text-xs">
            <span className="flex items-center gap-1 text-bridge-muted">
              <Clock size={12} />
              {formatDuration(service.duration)}
            </span>
            <span className="text-bridge-border-strong">·</span>
            <span className="font-data font-bold text-bridge-heading text-base tracking-tight">{formatPrice(service.price)}</span>
          </div>

          <Button onClick={() => onBook(service)} size="lg" className="w-full cursor-pointer shadow-md">
            Book this treatment
          </Button>

          <p className="text-center text-[11px] text-bridge-muted mt-2.5">
            This is what {creator.displayName.split(' ')[0]} experienced — book the exact same thing.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Booking modal (unchanged from previous) ──────────────────────────────────

function BookingModal({
  service, business, creator, linkId, deepLinkContentId, onClose,
}: {
  service: Service
  business: Business
  creator: Creator | null
  linkId?: string
  /** Video this booking is credited to via ?v= deep-link, if any. */
  deepLinkContentId?: string | null
  onClose: () => void
}) {
  const dates = getUpcomingDates(14)
  // Branches. Customer picks one when there's more than one; otherwise the
  // single (primary) branch is used silently.
  const locations = business.locations ?? []
  const multiLocation = locations.length > 1
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    locations.find((l) => l.isPrimary)?.id ?? locations[0]?.id ?? null,
  )
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) ?? null
  const [staffOptions, setStaffOptions] = useState<BookingStaff[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(dates[0] ?? null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [name, setName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('bridge_name') ?? '' : ''))
  const [email, setEmail] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('bridge_email') ?? '' : ''))
  const [phone, setPhone] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('bridge_phone') ?? '' : ''))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Fetch staff for this service on mount; show staff step if any exist
  useEffect(() => {
    fetch(`/api/businesses/${business.slug}/staff`)
      .then((r) => r.json())
      .then((all) => {
        if (!Array.isArray(all)) { setStaffLoaded(true); return }
        const eligible = all
          .filter((s) => Array.isArray(s.serviceIds) && s.serviceIds.includes(service.id))
          .map((s) => ({ id: s.id, name: s.name, role: s.role, photoUrl: s.photoUrl, locationId: s.locationId ?? null }))
        setStaffOptions(eligible)
        // Staff dropdown will appear inline on time step — no separate step needed
      })
      .catch(() => {})
      .finally(() => setStaffLoaded(true))
  }, [business.slug, service.id])

  // Only staff who work at the chosen branch are selectable.
  const branchStaff = multiLocation
    ? staffOptions.filter((s) => s.locationId === selectedLocationId)
    : staffOptions

  // Switching branch invalidates a previously-picked therapist.
  useEffect(() => {
    setSelectedStaffId(null)
  }, [selectedLocationId])

  // Fetch real availability when a date is picked
  useEffect(() => {
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    setLoadingSlots(true)
    setAvailability(null)
    setSelectedTime(null)
    const staffParam = selectedStaffId ? `&staffId=${selectedStaffId}` : ''
    const locationParam = selectedLocationId ? `&locationId=${selectedLocationId}` : ''
    fetch(`/api/businesses/${business.slug}/availability?date=${dateStr}&serviceId=${service.id}${staffParam}${locationParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setAvailability(data)
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, business.slug, service.id, selectedStaffId, selectedLocationId])

  const timeSessions = availability?.groups ?? []

  async function handleConfirm() {
    if (!selectedDate || !selectedTime) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      // Hybrid video attribution: explicit ?v= deep-link wins, else the last
      // video this viewer tapped for this business in the session.
      const contentId =
        deepLinkContentId ??
        (typeof window !== 'undefined'
          ? sessionStorage.getItem(lastTappedVideoKey(business.id))
          : null)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          businessId: business.id,
          locationId: selectedLocationId,
          linkId,
          contentId,
          staffId: selectedStaffId,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          bookingDate: dateStr,
          bookingTime: selectedTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Booking failed')

      if (data.mode === 'stripe' && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
        return
      }
      // In-app fallback — save details for pre-fill on return visits
      if (typeof window !== 'undefined') {
        localStorage.setItem('bridge_name', name)
        localStorage.setItem('bridge_email', email)
        localStorage.setItem('bridge_phone', phone)
      }
      setStep('confirmed')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceedFromDetails = name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-2xl bg-bridge-card rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto animate-scale-in pointer-events-auto">
          {step === 'confirmed' ? (
            <ConfirmedScreen
              service={service} business={business} creator={creator}
              date={selectedDate!} time={selectedTime!} name={name}
              branch={multiLocation && selectedLocation
                ? (selectedLocation.name ? `${selectedLocation.name} — ${selectedLocation.address}` : selectedLocation.address)
                : null}
              onClose={onClose}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-bridge-border/60">
                <div>
                  {step !== 'date' && (
                    <button
                      onClick={() => {
                        if (step === 'time') setStep('date')
                        if (step === 'details') setStep('time')
                      }}
                      className="flex items-center gap-1 text-bridge-muted text-sm mb-1 hover:text-bridge-secondary"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                  <h2 className="font-bold text-bridge-heading text-lg leading-tight">{service.name}</h2>
                  <p className="text-bridge-muted text-sm">
                    {formatDuration(service.duration)} · {formatPrice(service.price)}
                  </p>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-bridge-surface hover:bg-bridge-surface transition-colors">
                  <X size={16} className="text-bridge-secondary" />
                </button>
              </div>

              {/* Step progress indicator */}
              <div className="flex items-center gap-1.5 px-5 pt-3 pb-1">
                {(['date', 'time', 'details'] as const).map((s) => {
                  const stepOrder = ['date', 'time', 'details']
                  const current = stepOrder.indexOf(step)
                  const thisIdx = stepOrder.indexOf(s)
                  return (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        thisIdx === current ? 'bg-bridge-accent' : thisIdx < current ? 'bg-bridge-accent/40' : 'bg-bridge-border'
                      }`}
                    />
                  )
                })}
              </div>

              <div className="px-5 py-4 max-h-[70vh] overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="wait">
                {step === 'date' && (
                  <motion.div
                    key="date"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    {/* Branch picker — only when the business has more than one */}
                    {multiLocation && (
                      <div className="mb-5 bg-bridge-bg rounded-2xl p-3 border border-bridge-border">
                        <label className="block text-xs font-semibold text-bridge-text mb-1.5">
                          Choose a location
                        </label>
                        <select
                          value={selectedLocationId ?? ''}
                          onChange={(e) => setSelectedLocationId(e.target.value || null)}
                          className="w-full bg-bridge-card border border-bridge-border rounded-xl px-3 py-2.5 text-sm text-bridge-heading focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '14px',
                            paddingRight: '2.25rem',
                          }}
                        >
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name ? `${l.name} — ${l.address}` : l.address}
                            </option>
                          ))}
                        </select>
                        {selectedLocation && (
                          <p className="text-[10px] text-bridge-muted mt-1.5 flex items-center gap-1">
                            <MapPin size={10} /> {selectedLocation.address}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-4">Select Date</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {dates.map((date) => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString()
                        const isToday = date.toDateString() === new Date().toDateString()
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => setSelectedDate(date)}
                            className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border-2 transition-all ${
                              isSelected ? 'border-bridge-accent bg-bridge-accent text-white' : 'border-bridge-border bg-bridge-card text-bridge-text hover:border-bridge-accent-light'
                            }`}
                          >
                            <span className={`text-xs mb-1 ${isSelected ? 'text-bridge-accent-soft' : 'text-bridge-muted'}`}>
                              {DAY_NAMES[date.getDay()]}
                            </span>
                            <span className="text-xl font-bold leading-none">{date.getDate()}</span>
                            <span className={`text-xs mt-1 ${isSelected ? 'text-bridge-accent-soft' : 'text-bridge-muted'}`}>
                              {isToday ? 'Today' : MONTH_NAMES[date.getMonth()]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <Button
                      disabled={!selectedDate}
                      onClick={() => setStep('time')}
                      size="lg"
                      className="w-full mt-6 cursor-pointer"
                    >
                      Continue <ChevronRight size={18} />
                    </Button>
                  </motion.div>
                )}

                {step === 'time' && (
                  <motion.div
                    key="time"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-4">
                      Select Time · {selectedDate && `${DAY_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]}`}
                      {availability?.hours && (
                        <span className="ml-2 normal-case text-bridge-border-strong font-normal lowercase">
                          (open {availability.hours.replace('-', '–')})
                        </span>
                      )}
                    </p>

                    {/* Preferred therapist (inline, optional) */}
                    {branchStaff.length > 0 && (
                      <div className="mb-5 bg-bridge-bg rounded-2xl p-3 border border-bridge-border">
                        <label className="block text-xs font-semibold text-bridge-text mb-1.5">
                          Preferred therapist <span className="text-bridge-muted font-normal">(optional)</span>
                        </label>
                        <select
                          value={selectedStaffId ?? ''}
                          onChange={(e) => setSelectedStaffId(e.target.value || null)}
                          className="w-full bg-bridge-card border border-bridge-border rounded-xl px-3 py-2.5 text-sm text-bridge-heading focus:outline-none focus:ring-2 focus:ring-bridge-accent focus:border-transparent appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '14px',
                            paddingRight: '2.25rem',
                          }}
                        >
                          <option value="">Any available</option>
                          {branchStaff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.role ? ` · ${s.role}` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-bridge-muted mt-1.5">
                          {selectedStaffId
                            ? "Showing only this therapist's available times."
                            : "We'll auto-assign the best available therapist."}
                        </p>
                      </div>
                    )}

                    {loadingSlots && (
                      <p className="text-bridge-muted text-sm py-8 text-center">Checking availability…</p>
                    )}

                    {!loadingSlots && availability?.closed && (
                      <div className="text-center py-8 text-bridge-muted text-sm">
                        {business.name} is closed this day. Pick another date.
                      </div>
                    )}

                    {!loadingSlots && availability && !availability.closed && timeSessions.length === 0 && (
                      <div className="text-center py-8 text-bridge-muted text-sm">
                        No slots available — try another date.
                      </div>
                    )}

                    {!loadingSlots && timeSessions.map(({ label, slots }) => {
                      const anyAvailable = slots.some((s) => s.available)
                      return (
                      <div key={label} className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-bridge-muted">{label}</p>
                          {!anyAvailable && (
                            <p className="text-[10px] text-bridge-border-strong uppercase tracking-wide">Fully booked</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {slots.map(({ time, available }) => {
                            const isSelected = selectedTime === time
                            return (
                              <button
                                key={time}
                                disabled={!available}
                                onClick={() => setSelectedTime(time)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                  !available ? 'border-bridge-border/60 text-bridge-border-strong cursor-not-allowed bg-bridge-bg'
                                  : isSelected ? 'border-bridge-accent bg-bridge-accent text-white'
                                  : 'border-bridge-border text-bridge-text bg-bridge-card hover:border-bridge-accent-light'
                                }`}
                              >
                                {time}
                              </button>
                            )
                          })}
                        </div>
                      </div>)
                    })}
                    <Button
                      disabled={!selectedTime}
                      onClick={() => setStep('details')}
                      size="lg"
                      className="w-full mt-2 cursor-pointer"
                    >
                      Continue <ChevronRight size={18} />
                    </Button>
                  </motion.div>
                )}

                {step === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <p className="text-xs font-semibold text-bridge-muted uppercase tracking-widest mb-4">Your Details</p>
                    <div className="bg-bridge-accent-wash rounded-xl px-4 py-3 mb-6 text-sm">
                      <p className="font-semibold text-bridge-text">{service.name}</p>
                      <p className="text-bridge-muted mt-0.5">
                        {selectedDate && `${DAY_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]}`} at {selectedTime}
                      </p>
                      {multiLocation && selectedLocation && (
                        <p className="text-bridge-muted mt-0.5 flex items-center gap-1">
                          <MapPin size={11} /> {selectedLocation.name ? `${selectedLocation.name} — ${selectedLocation.address}` : selectedLocation.address}
                        </p>
                      )}
                    </div>
                    <div className="space-y-4">
                      <Input
                        label="Full Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                      <Input
                        label="Phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+66…"
                      />
                    </div>
                    {submitError && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{submitError}</div>
                    )}
                    <Button
                      disabled={!canProceedFromDetails}
                      loading={submitting}
                      onClick={handleConfirm}
                      size="lg"
                      className="w-full mt-6 cursor-pointer"
                    >
                      {submitting ? 'Processing…' : 'Confirm & Pay'}
                    </Button>
                    <p className="text-center text-xs text-bridge-muted mt-3">
                      Secure payment via Stripe. {business.name} confirms after payment.
                    </p>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function ConfirmedScreen({
  service, business, creator, date, time, name, branch, onClose,
}: {
  service: Service; business: Business; creator: Creator | null; date: Date; time: string; name: string; branch?: string | null; onClose: () => void
}) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-bridge-accent-soft flex items-center justify-center mb-6">
        <Check size={36} className="text-bridge-accent" strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-bold text-bridge-heading mb-2">You&apos;re booked!</h2>
      <p className="text-bridge-muted text-sm mb-6 max-w-xs">{business.name} will send a confirmation to you shortly.</p>
      <div className="w-full bg-bridge-bg rounded-2xl p-4 text-left space-y-2.5 mb-8">
        <div className="flex justify-between text-sm">
          <span className="text-bridge-muted">Service</span>
          <span className="font-semibold text-bridge-text">{service.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-bridge-muted">Date & Time</span>
          <span className="font-semibold text-bridge-text">
            {DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]} at {time}
          </span>
        </div>
        {branch && (
          <div className="flex justify-between text-sm gap-3">
            <span className="text-bridge-muted flex-shrink-0">Location</span>
            <span className="font-semibold text-bridge-text text-right">{branch}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-bridge-muted">Name</span>
          <span className="font-semibold text-bridge-text">{name}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-bridge-border pt-2.5">
          <span className="text-bridge-muted">Total</span>
          <span className="font-bold text-bridge-heading text-base">฿{service.price.toLocaleString()}</span>
        </div>
      </div>
      <Button onClick={onClose} size="lg" variant="secondary" className="w-full bg-bridge-ink text-bridge-ink-foreground border-bridge-ink hover:bg-bridge-ink-hover cursor-pointer">
        Done
      </Button>
      {creator && (
        <NextLink
          href={`/${creator.slug}`}
          className="block w-full py-3 mt-3 rounded-2xl bg-bridge-accent-wash text-bridge-accent text-center font-semibold text-sm hover:bg-bridge-accent-soft transition-colors"
        >
          See what else {creator.displayName.split(' ')[0]} recommends →
        </NextLink>
      )}
      <PoweredByPloi className="mt-4" />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyServices({ business }: { business: Business }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-bridge-accent-wash rounded-full mb-4">
        <Sparkles size={22} className="text-bridge-accent" />
      </div>
      <h3 className="font-bold text-bridge-heading text-base mb-1">{business.name} is setting up</h3>
      <p className="text-bridge-muted text-sm max-w-xs mx-auto">
        This page isn&apos;t published yet — services will appear here once they&apos;re added.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShopBookingPage({ business, creator, link, affiliations, content, recentBookings, isOwner = false }: Props) {
  const [activeService, setActiveService] = useState<Service | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showServicePicker, setShowServicePicker] = useState(false)
  // Explicit per-video deep-link (?v=<id>) — the strong half of booking attribution.
  // Only honoured when the id actually belongs to this page's content.
  const [deepLinkContentId, setDeepLinkContentId] = useState<string | null>(null)
  const servicesRef = useRef<HTMLDivElement>(null)

  // Click attribution
  useEffect(() => {
    if (!creator || !link || link.status !== 'active') return
    const key = `bridge_click_${link.shortCode}`
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch(`/api/links/${encodeURIComponent(link.shortCode)}/click`, { method: 'POST' }).catch(() => {})
  }, [creator, link])

  // Resolve the ?v= deep-link once, validating it against this page's videos.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = new URLSearchParams(window.location.search).get('v')
    if (v && content.some((c) => c.content.id === v)) setDeepLinkContentId(v)
  }, [content])

  // Content-first: featured service heroes (if link has any + creator is present).
  // Preserves the creator's selection order.
  const featuredServices =
    creator && link?.featuredServiceIds.length
      ? link.featuredServiceIds
          .map((id) => business.services.find((s) => s.id === id))
          .filter((s): s is Service => !!s)
      : []
  const featuredIds = new Set(featuredServices.map((s) => s.id))
  const otherServices = featuredServices.length
    ? business.services.filter((s) => !featuredIds.has(s.id))
    : business.services
  const hasServices = business.services.length > 0
  const fromPrice = hasServices ? Math.min(...business.services.map(s => s.price)) : null
  const photos = business.photos.length > 0 ? business.photos : business.coverPhotoUrl ? [business.coverPhotoUrl] : []

  function scrollToServices() {
    if (business.services.length === 1) {
      // skip the picker, open directly
      setActiveService(business.services[0])
      return
    }
    setShowServicePicker(true)
  }

  return (
    <div className="min-h-screen bg-bridge-bg">
      <div className="max-w-2xl mx-auto relative">
        {/* Owner shortcut — only the signed-in owner sees this */}
        {isOwner && (
          <div className="bg-bridge-ink-static text-white px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-xs text-white/70">This is your public listing</span>
            <NextLink
              href="/business"
              className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-white/80 transition-colors"
            >
              <LayoutDashboard size={12} /> Go to dashboard
            </NextLink>
          </div>
        )}

        <BusinessHero business={business} recentBookings={recentBookings} affiliationsCount={affiliations.length} />

        {creator && (
          <div className="mt-3">
            <CreatorBar creator={creator} link={link} />
          </div>
        )}

        {/* Creators callout — first-class social proof, right under the attribution bar */}
        <CreatorsCallout affiliations={affiliations} business={business} />

        {/* Photo gallery */}
        <PhotoGallery photos={photos} onOpen={(i) => setLightboxIndex(i)} />

        {/* Creator content wall (content-first: photos → creator video → services) */}
        <ContentWall content={content} />

        {/* About section */}
        <AboutSection business={business} />

        {/* Featured services (content-first heroes) */}
        {creator && featuredServices.map((service) => (
          <FeaturedServiceCard
            key={service.id}
            service={service}
            business={business}
            creator={creator}
            link={link}
            onBook={setActiveService}
          />
        ))}

        {/* Services */}
        <div className="px-4 mt-6 pb-2" ref={servicesRef}>
          {hasServices ? (
            <>
              <h2 className="text-sm font-semibold text-bridge-muted uppercase tracking-widest mb-4">
                {featuredServices.length ? 'Or explore other services' : 'Our Services'}
              </h2>
              <div className="space-y-3">
                {otherServices.map((service, i) => (
                  <ServiceCard key={service.id} service={service} onBook={setActiveService} isPopular={i === 0 && !featuredServices.length} />
                ))}
              </div>
            </>
          ) : (
            <EmptyServices business={business} />
          )}
        </div>

        {/* Bottom padding so content clears the sticky button */}
        <div className="pb-32" />

        {/* Sticky Book Now bar — Klook-style with price context */}
        {hasServices && (
          <div className="fixed bottom-0 left-0 right-0 z-30 max-w-2xl mx-auto bg-bridge-card border-t border-bridge-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                {fromPrice !== null && (
                  <p className="text-base font-bold text-bridge-heading leading-tight">from <span className="font-data tracking-tight">{formatPrice(fromPrice)}</span></p>
                )}
                <p className="text-xs text-bridge-muted">{business.services.length} service{business.services.length !== 1 ? 's' : ''} available</p>
              </div>
              <Button onClick={scrollToServices} size="lg" variant="book" className="shadow-lg cursor-pointer flex-shrink-0">
                Book Now
              </Button>
            </div>
          </div>
        )}

        {/* Service picker sheet (when bottom button tapped with multiple services) */}
        {showServicePicker && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={() => setShowServicePicker(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-2xl bg-bridge-card rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto animate-scale-in pointer-events-auto">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-bridge-border/60">
                  <h2 className="font-bold text-bridge-heading text-lg">Pick a service</h2>
                  <button
                    onClick={() => setShowServicePicker(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-bridge-surface hover:bg-bridge-surface"
                  >
                    <X size={16} className="text-bridge-secondary" />
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {business.services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setShowServicePicker(false)
                        setActiveService(s)
                      }}
                      className="w-full text-left bg-bridge-bg hover:bg-bridge-surface rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-bridge-heading text-sm">{s.name}</p>
                        <p className="text-bridge-muted text-xs">{formatDuration(s.duration)}</p>
                      </div>
                      <span className="font-bold text-bridge-heading text-sm flex-shrink-0">{formatPrice(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Booking modal */}
        {activeService && (
          <BookingModal
            service={activeService}
            business={business}
            creator={creator}
            linkId={link?.id}
            deepLinkContentId={deepLinkContentId}
            onClose={() => setActiveService(null)}
          />
        )}

        {/* Photo lightbox */}
        {lightboxIndex !== null && (
          <PhotoLightbox photos={photos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}
      </div>
    </div>
  )
}
