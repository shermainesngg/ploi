'use client'

import { useState, useEffect, useRef } from 'react'
import NextLink from 'next/link'
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
} from 'lucide-react'
import type {
  Business,
  Creator,
  Service,
  Link as LinkRecord,
  BusinessCreatorAffiliation,
  SocialPlatform,
  DayKey,
} from '@/lib/types'
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
  recentBookings: number
}

type Step = 'services' | 'date' | 'time' | 'details' | 'confirmed'

interface BookingStaff {
  id: string
  name: string
  role: string | null
  photoUrl: string | null
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
  const [from, to] = business.coverGradient
  const hasPhoto = !!business.coverPhotoUrl
  const fromPrice = business.services.length
    ? Math.min(...business.services.map((s) => s.price))
    : null

  return (
    <div className="relative">
      {hasPhoto ? (
        <div className="absolute inset-0">
          <img src={business.coverPhotoUrl!} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/65" />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
      )}

      <div className="relative px-5 pt-14 pb-8">
        <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 backdrop-blur-sm">
          {business.category}
        </span>
        <h1 className="text-3xl font-black text-white leading-tight mb-2">{business.name}</h1>
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

        {/* Trust signals row */}
        {(recentBookings > 0 || affiliationsCount > 0) && (
          <div className="flex flex-wrap items-center gap-3 mt-4 text-white/90 text-xs">
            {recentBookings > 0 && (
              <span className="flex items-center gap-1.5">
                <TrendingUp size={12} />
                <span className="font-semibold">{recentBookings}</span>
                <span className="text-white/70">booked this week</span>
              </span>
            )}
            {affiliationsCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Users size={12} />
                <span className="text-white/70">Recommended by</span>
                <span className="font-semibold">{affiliationsCount} creator{affiliationsCount !== 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Creator attribution bar ───────────────────────────────────────────────────

function CreatorBar({ creator, link }: { creator: Creator; link: LinkRecord | null }) {
  const inner = (
    <div className="mx-4 -mt-3 relative z-10 bg-white rounded-2xl shadow-sm border border-stone-100 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: creator.avatarColor }}
        >
          {creator.avatarInitials}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-stone-400 leading-none mb-0.5">Recommended by</p>
          <p className="text-sm font-semibold text-stone-800 leading-none truncate">{creator.handle}</p>
          {link?.contentUrl && (
            <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
              <ExternalLink size={10} />
              <span className="truncate">Watch the {link.platform ?? 'post'}</span>
            </p>
          )}
        </div>
      </div>
      <span className="text-xs font-black tracking-tight text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full flex-shrink-0">
        BRIDGE
      </span>
    </div>
  )
  if (link?.contentUrl) {
    return (
      <a href={link.contentUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
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
            className="flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden snap-start active:scale-95 transition-transform"
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
            className={`w-2 h-2 rounded-full ${n === i ? 'bg-white' : 'bg-white/30'}`}
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
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-3 flex items-center justify-between active:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-3 text-left">
            {hasHours && todayHours && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                openNow ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'
              }`}>
                {openNow ? 'Open now' : 'Closed'}
              </span>
            )}
            <span className="text-sm font-semibold text-stone-800">About this place</span>
          </div>
          <ChevronDown size={16} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="border-t border-stone-100 px-4 py-4 space-y-4">
            {business.description && (
              <p className="text-stone-600 text-sm leading-relaxed">{business.description}</p>
            )}

            {/* Hours */}
            {hasHours && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Hours</p>
                <div className="space-y-1 text-sm">
                  {DAY_ORDER.map((d) => {
                    const h = business.openingHours?.[d]
                    const isToday = d === today
                    return (
                      <div key={d} className={`flex justify-between ${isToday ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>
                        <span>{DAY_LABELS[d]}{isToday && ' (today)'}</span>
                        <span>{h && h !== 'closed' ? h : 'Closed'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Location</p>
              <p className="text-sm text-stone-600 mb-2">{business.location}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location + ' ' + business.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-rose-600 text-sm font-semibold hover:underline"
              >
                <MapPin size={13} /> Open in Google Maps
              </a>
            </div>

            {/* Contact */}
            {hasContact && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Contact</p>
                <div className="space-y-2">
                  {business.contactPhone && (
                    <a
                      href={`tel:${business.contactPhone.replace(/\s+/g, '')}`}
                      className="flex items-center gap-2 text-sm text-stone-700 font-medium"
                    >
                      <Phone size={13} className="text-stone-400" />
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
                      className="flex items-center gap-2 text-sm text-stone-700 font-medium"
                    >
                      <MessageCircle size={13} className="text-stone-400" />
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
          className="w-full bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md active:scale-[0.99] transition-all overflow-hidden group"
        >
          <div className="px-4 py-3.5 flex items-center gap-3">
            {/* Stacked avatars */}
            <div className="flex-shrink-0 flex items-center">
              {visibleAvatars.map((a, i) => (
                <div
                  key={a.creator.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black ring-[3px] ring-white relative"
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
                  className="w-10 h-10 rounded-full flex items-center justify-center text-stone-600 text-[11px] font-black bg-stone-100 ring-[3px] ring-white"
                  style={{ marginLeft: '-12px', zIndex: 0 }}
                >
                  +{overflow}
                </div>
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-stone-900 leading-tight">
                {count === 1 ? '1 creator' : `${count} creators`}{' '}
                <span className="font-medium text-stone-500">recommend{count === 1 ? 's' : ''} this place</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                <Users size={11} />
                <span>Tap to see their content</span>
              </p>
            </div>

            <ChevronRight size={18} className="text-stone-300 flex-shrink-0 group-hover:text-rose-500 transition-colors" />
          </div>

          {/* Optional: thin gradient strip at bottom for visual flourish */}
          <div className="h-1 bg-gradient-to-r from-rose-400 via-pink-500 to-orange-400" />
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
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
          {/* Close */}
          <div className="flex justify-end p-4 pb-0">
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200"
            >
              <X size={16} className="text-stone-600" />
            </button>
          </div>

          {/* Creator header */}
          <div className="px-5 pt-2 pb-5">
            <div className="flex items-start gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
                style={{ backgroundColor: creator.avatarColor }}
              >
                {creator.avatarInitials}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-black text-stone-900 text-lg leading-tight">{creator.displayName}</h3>
                <p className="text-rose-600 font-semibold text-sm">{creator.handle}</p>
                <p className="text-stone-400 text-xs mt-1">
                  Has recommended {affiliation.totalPlacesRecommended} place{affiliation.totalPlacesRecommended !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {creator.bio && (
              <p className="text-stone-600 text-sm leading-relaxed mt-3">{creator.bio}</p>
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
                    className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full text-stone-700 text-xs font-semibold"
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
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                Their content about {business.name}
              </p>
              <a
                href={link.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative aspect-video rounded-2xl overflow-hidden bg-stone-200 group"
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
                    <Play size={20} className="text-rose-600 fill-rose-600 ml-0.5" />
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
              className="block w-full py-3 rounded-2xl bg-stone-900 text-white text-center font-semibold text-sm hover:bg-stone-800 transition-all"
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
      <div className="fixed inset-0 z-50 max-w-[480px] mx-auto animate-slide-up flex flex-col bg-stone-50">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-black text-stone-900 text-base">All creators</h3>
            <p className="text-xs text-stone-400">{affiliations.length} recommend {business.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200"
          >
            <X size={16} className="text-stone-600" />
          </button>
        </div>

        {/* Sort */}
        <div className="bg-white px-5 py-2 border-b border-stone-100 flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-stone-400">Sort:</span>
          {(['bookings', 'recent'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                sortBy === s ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'
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
              className="w-full text-left bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
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
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-black flex-shrink-0"
                  style={{ backgroundColor: a.creator.avatarColor }}
                >
                  {a.creator.avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 text-sm truncate">{a.creator.handle}</p>
                  <p className="text-stone-400 text-xs truncate">{a.creator.displayName}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {a.totalPlacesRecommended} places · {a.bookingsDriven} bookings driven
                  </p>
                </div>
                {a.link.contentUrl && (
                  <span className="flex-shrink-0 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg">
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
}: {
  service: Service
  onBook: (service: Service) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-900 text-base leading-snug mb-1">{service.name}</h3>
          <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 mb-3">{service.description}</p>
          <div className="flex items-center gap-3 text-stone-500 text-xs">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(service.duration)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-stone-900 font-bold text-lg leading-none">{formatPrice(service.price)}</span>
          <button
            onClick={() => onBook(service)}
            className="bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-rose-700 active:scale-95 transition-all"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Booking modal (unchanged from previous) ──────────────────────────────────

function BookingModal({
  service, business, creator, linkId, onClose,
}: {
  service: Service
  business: Business
  creator: Creator | null
  linkId?: string
  onClose: () => void
}) {
  const [staffOptions, setStaffOptions] = useState<BookingStaff[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  // initial step depends on whether staff exist for this service — set after fetch
  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const dates = getUpcomingDates(14)
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
          .map((s) => ({ id: s.id, name: s.name, role: s.role, photoUrl: s.photoUrl }))
        setStaffOptions(eligible)
        // Staff dropdown will appear inline on time step — no separate step needed
      })
      .catch(() => {})
      .finally(() => setStaffLoaded(true))
  }, [business.slug, service.id])

  // Fetch real availability when a date is picked
  useEffect(() => {
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    setLoadingSlots(true)
    setAvailability(null)
    setSelectedTime(null)
    const staffParam = selectedStaffId ? `&staffId=${selectedStaffId}` : ''
    fetch(`/api/businesses/${business.slug}/availability?date=${dateStr}&serviceId=${service.id}${staffParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setAvailability(data)
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, business.slug, service.id, selectedStaffId])

  const timeSessions = availability?.groups ?? []

  async function handleConfirm() {
    if (!selectedDate || !selectedTime) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          businessId: business.id,
          linkId,
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
      // In-app fallback
      setStep('confirmed')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceedFromDetails = name.trim().length > 0 && email.trim().length > 0

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden">
          {step === 'confirmed' ? (
            <ConfirmedScreen
              service={service} business={business}
              date={selectedDate!} time={selectedTime!} name={name}
              onClose={onClose}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
                <div>
                  {step !== 'date' && (
                    <button
                      onClick={() => {
                        if (step === 'time') setStep('date')
                        if (step === 'details') setStep('time')
                      }}
                      className="flex items-center gap-1 text-stone-400 text-sm mb-1 hover:text-stone-600"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                  <h2 className="font-bold text-stone-900 text-lg leading-tight">{service.name}</h2>
                  <p className="text-stone-400 text-sm">
                    {formatDuration(service.duration)} · {formatPrice(service.price)}
                  </p>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors">
                  <X size={16} className="text-stone-600" />
                </button>
              </div>

              <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
                {step === 'date' && (
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Select Date</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {dates.map((date) => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString()
                        const isToday = date.toDateString() === new Date().toDateString()
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => setSelectedDate(date)}
                            className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border-2 transition-all ${
                              isSelected ? 'border-rose-600 bg-rose-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-rose-300'
                            }`}
                          >
                            <span className={`text-xs mb-1 ${isSelected ? 'text-rose-100' : 'text-stone-400'}`}>
                              {DAY_NAMES[date.getDay()]}
                            </span>
                            <span className="text-xl font-bold leading-none">{date.getDate()}</span>
                            <span className={`text-xs mt-1 ${isSelected ? 'text-rose-100' : 'text-stone-400'}`}>
                              {isToday ? 'Today' : MONTH_NAMES[date.getMonth()]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <button
                      disabled={!selectedDate}
                      onClick={() => setStep('time')}
                      className="w-full mt-6 py-4 rounded-2xl bg-rose-600 text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      Continue <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {step === 'time' && (
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
                      Select Time · {selectedDate && `${DAY_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]}`}
                      {availability?.hours && (
                        <span className="ml-2 normal-case text-stone-300 font-normal lowercase">
                          (open {availability.hours.replace('-', '–')})
                        </span>
                      )}
                    </p>

                    {/* Preferred therapist (inline, optional) */}
                    {staffOptions.length > 0 && (
                      <div className="mb-5 bg-stone-50 rounded-2xl p-3 border border-stone-200">
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                          Preferred therapist <span className="text-stone-400 font-normal">(optional)</span>
                        </label>
                        <select
                          value={selectedStaffId ?? ''}
                          onChange={(e) => setSelectedStaffId(e.target.value || null)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent appearance-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '14px',
                            paddingRight: '2.25rem',
                          }}
                        >
                          <option value="">Any available</option>
                          {staffOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.role ? ` · ${s.role}` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-stone-400 mt-1.5">
                          {selectedStaffId
                            ? "Showing only this therapist's available times."
                            : "We'll auto-assign the best available therapist."}
                        </p>
                      </div>
                    )}

                    {loadingSlots && (
                      <p className="text-stone-400 text-sm py-8 text-center">Checking availability…</p>
                    )}

                    {!loadingSlots && availability?.closed && (
                      <div className="text-center py-8 text-stone-500 text-sm">
                        {business.name} is closed this day. Pick another date.
                      </div>
                    )}

                    {!loadingSlots && availability && !availability.closed && timeSessions.length === 0 && (
                      <div className="text-center py-8 text-stone-500 text-sm">
                        No slots available — try another date.
                      </div>
                    )}

                    {!loadingSlots && timeSessions.map(({ label, slots }) => {
                      const anyAvailable = slots.some((s) => s.available)
                      return (
                      <div key={label} className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-stone-400">{label}</p>
                          {!anyAvailable && (
                            <p className="text-[10px] text-stone-300 uppercase tracking-wide">Fully booked</p>
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
                                  !available ? 'border-stone-100 text-stone-300 cursor-not-allowed bg-stone-50'
                                  : isSelected ? 'border-rose-600 bg-rose-600 text-white'
                                  : 'border-stone-200 text-stone-700 bg-white hover:border-rose-300'
                                }`}
                              >
                                {time}
                              </button>
                            )
                          })}
                        </div>
                      </div>)
                    })}
                    <button
                      disabled={!selectedTime}
                      onClick={() => setStep('details')}
                      className="w-full mt-2 py-4 rounded-2xl bg-rose-600 text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      Continue <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {step === 'details' && (
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Your Details</p>
                    <div className="bg-rose-50 rounded-xl px-4 py-3 mb-6 text-sm">
                      <p className="font-semibold text-stone-800">{service.name}</p>
                      <p className="text-stone-500 mt-0.5">
                        {selectedDate && `${DAY_NAMES[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]}`} at {selectedTime}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">Full Name</label>
                        <input
                          type="text" value={name} onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                        <input
                          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoCapitalize="none" autoCorrect="off"
                          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone <span className="text-stone-400 font-normal text-xs">(optional)</span></label>
                        <input
                          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                          placeholder="+66…"
                          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                        />
                      </div>
                    </div>
                    {submitError && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{submitError}</div>
                    )}
                    <button
                      disabled={!canProceedFromDetails || submitting}
                      onClick={handleConfirm}
                      className="w-full mt-6 py-4 rounded-2xl bg-rose-600 text-white font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-700 active:scale-[0.98] transition-all"
                    >
                      {submitting ? 'Processing…' : 'Confirm & Pay'}
                    </button>
                    <p className="text-center text-xs text-stone-400 mt-3">
                      Secure payment via Stripe. {business.name} confirms after payment.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function ConfirmedScreen({
  service, business, date, time, name, onClose,
}: {
  service: Service; business: Business; date: Date; time: string; name: string; onClose: () => void
}) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-6">
        <Check size={36} className="text-rose-600" strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-black text-stone-900 mb-2">You&apos;re booked!</h2>
      <p className="text-stone-500 text-sm mb-6 max-w-xs">{business.name} will send a confirmation to you shortly.</p>
      <div className="w-full bg-stone-50 rounded-2xl p-4 text-left space-y-2.5 mb-8">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Service</span>
          <span className="font-semibold text-stone-800">{service.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Date & Time</span>
          <span className="font-semibold text-stone-800">
            {DAY_NAMES[date.getDay()]} {date.getDate()} {MONTH_NAMES[date.getMonth()]} at {time}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Name</span>
          <span className="font-semibold text-stone-800">{name}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-stone-200 pt-2.5">
          <span className="text-stone-500">Total</span>
          <span className="font-bold text-stone-900 text-base">฿{service.price.toLocaleString()}</span>
        </div>
      </div>
      <button onClick={onClose} className="w-full py-4 rounded-2xl bg-stone-900 text-white font-semibold text-base hover:bg-stone-800 active:scale-[0.98] transition-all">
        Done
      </button>
      <p className="text-xs text-stone-400 mt-4">Powered by <span className="font-black text-rose-600">BRIDGE</span></p>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyServices({ business }: { business: Business }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-50 rounded-full mb-4">
        <Sparkles size={22} className="text-rose-500" />
      </div>
      <h3 className="font-bold text-stone-900 text-base mb-1">{business.name} is setting up</h3>
      <p className="text-stone-500 text-sm max-w-xs mx-auto">
        This page isn&apos;t published yet — services will appear here once they&apos;re added.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShopBookingPage({ business, creator, link, affiliations, recentBookings }: Props) {
  const [activeService, setActiveService] = useState<Service | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showServicePicker, setShowServicePicker] = useState(false)
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

  const hasServices = business.services.length > 0
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[480px] mx-auto relative">
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

        {/* About section */}
        <AboutSection business={business} />

        {/* Services */}
        <div className="px-4 mt-6 pb-2" ref={servicesRef}>
          {hasServices ? (
            <>
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">Our Services</h2>
              <div className="space-y-3">
                {business.services.map((service) => (
                  <ServiceCard key={service.id} service={service} onBook={setActiveService} />
                ))}
              </div>
            </>
          ) : (
            <EmptyServices business={business} />
          )}
        </div>

        {/* Bottom padding so content clears the sticky button */}
        <div className="pb-32" />

        {/* Sticky Book Now button */}
        {hasServices && (
          <div className="fixed bottom-0 left-0 right-0 z-30 max-w-[480px] mx-auto bg-gradient-to-t from-stone-50 via-stone-50/95 to-stone-50/0 px-4 pt-6 pb-4 pointer-events-none">
            <button
              onClick={scrollToServices}
              className="w-full py-4 rounded-2xl bg-rose-600 text-white font-semibold text-base hover:bg-rose-700 active:scale-[0.98] transition-all shadow-xl pointer-events-auto"
            >
              Book Now
            </button>
          </div>
        )}

        {/* Service picker sheet (when bottom button tapped with multiple services) */}
        {showServicePicker && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={() => setShowServicePicker(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto animate-slide-up">
              <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100">
                  <h2 className="font-bold text-stone-900 text-lg">Pick a service</h2>
                  <button
                    onClick={() => setShowServicePicker(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200"
                  >
                    <X size={16} className="text-stone-600" />
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
                      className="w-full text-left bg-stone-50 hover:bg-stone-100 rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900 text-sm">{s.name}</p>
                        <p className="text-stone-400 text-xs">{formatDuration(s.duration)}</p>
                      </div>
                      <span className="font-bold text-stone-900 text-sm flex-shrink-0">{formatPrice(s.price)}</span>
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
