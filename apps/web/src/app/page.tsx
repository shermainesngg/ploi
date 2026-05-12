import Link from 'next/link'
import { ArrowRight, Star, MapPin } from 'lucide-react'
import { BusinessService } from '@/services/business.service'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

export default async function Home() {
  const businesses = await BusinessService.list()
  const featured = businesses.slice(0, 6)

  return (
    <div className="min-h-screen bg-bridge-bg">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-bridge-border/30">
        <div className="absolute inset-0 bg-gradient-to-br from-bridge-accent-wash via-bridge-bg to-bridge-bg" />
        <div className="absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full bg-bridge-accent/[0.035]" />
        <div className="absolute right-16 bottom-12 w-40 h-40 rounded-full border border-bridge-accent/[0.08] hidden sm:block" />

        <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-14 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-28">
          <p className="text-micro uppercase tracking-[0.25em] text-bridge-muted mb-8 sm:mb-10">
            Bangkok&rsquo;s creator-curated bookings
          </p>
          <h1 className="font-display text-display text-bridge-heading max-w-2xl">
            Book local experiences{' '}
            <span className="text-bridge-accent">recommended by creators</span>{' '}
            you trust.
          </h1>
          <p className="text-body-lg text-bridge-muted max-w-md mt-6 mb-12">
            See it on TikTok. Tap. Book. Done.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-sm">
            <Link href="#featured" className="flex-1">
              <Button size="lg" className="w-full gap-1.5 cursor-pointer">
                Find a place <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/signup" className="flex-1">
              <Button variant="secondary" size="lg" className="w-full cursor-pointer">
                Join as creator
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured businesses */}
      <section id="featured" className="max-w-5xl mx-auto px-4 sm:px-6 mt-14 sm:mt-20">
        <AnimateOnScroll>
          <div className="flex items-baseline justify-between mb-8 px-1">
            <div>
              <h2 className="font-display text-heading text-bridge-heading">
                Featured places
              </h2>
              <p className="text-caption text-bridge-muted mt-1">Handpicked by our creator community</p>
            </div>
          </div>
        </AnimateOnScroll>

        {featured.length === 0 ? (
          <p className="text-bridge-muted text-body text-center py-16">No businesses listed yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            {featured.map((b, i) => (
              <AnimateOnScroll key={b.id} delay={i * 80}>
                <FeaturedCard business={b} />
              </AnimateOnScroll>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto mt-20 sm:mt-32 px-4 sm:px-6">
        <AnimateOnScroll>
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-micro uppercase tracking-[0.25em] text-bridge-accent font-bold mb-4">How it works</p>
            <h2 className="font-display text-heading text-bridge-heading">
              From content to confirmed
              <br className="hidden sm:inline" /> in three steps
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
          <AnimateOnScroll delay={0}>
            <HowStep
              n="01"
              title="Discover via creators"
              body="Find spots through TikToks and Reels from creators you already follow and trust."
            />
          </AnimateOnScroll>
          <AnimateOnScroll delay={120}>
            <HowStep
              n="02"
              title="Book instantly"
              body="One tap from the creator's link to a confirmed appointment. Pick your time, done."
            />
          </AnimateOnScroll>
          <AnimateOnScroll delay={240}>
            <HowStep
              n="03"
              title="Creators earn"
              body="The creator who recommended the spot earns a commission. Everyone wins."
            />
          </AnimateOnScroll>
        </div>
      </section>

      {/* CTA */}
      <AnimateOnScroll as="section" className="max-w-5xl mx-auto mt-20 sm:mt-32 px-4 sm:px-6">
        <div className="bg-bridge-heading rounded-2xl p-8 sm:p-14 relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-bridge-accent/10" />
          <div className="relative">
            <p className="text-micro uppercase tracking-[0.25em] text-bridge-accent-light font-bold mb-4">Get started</p>
            <h3 className="font-display text-heading text-white leading-tight max-w-md">
              Are you a business or creator?
            </h3>
            <p className="text-bridge-border text-body mt-3 mb-10 max-w-sm">
              Get on BRIDGE in under 10 minutes. No setup fees, no commitment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <Link href="/onboard/business" className="flex-1">
                <Button variant="secondary" size="lg" className="w-full bg-white text-bridge-heading border-white hover:bg-bridge-surface cursor-pointer">
                  List your business
                </Button>
              </Link>
              <Link href="/onboard/creator" className="flex-1">
                <Button size="lg" className="w-full cursor-pointer">
                  Join as creator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AnimateOnScroll>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto mt-20 px-5 pb-16">
        <div className="border-t border-bridge-border/60 pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <span className="font-display text-lg font-bold text-bridge-accent">BRIDGE</span>
              <p className="text-caption text-bridge-muted mt-1">Bangkok&rsquo;s creator-curated bookings</p>
            </div>
            <div className="flex items-center gap-6 text-caption text-bridge-muted">
              <Link href="/onboard/creator" className="hover:text-bridge-text transition-colors cursor-pointer">Creators</Link>
              <Link href="/onboard/business" className="hover:text-bridge-text transition-colors cursor-pointer">Businesses</Link>
              <Link href="/login" className="hover:text-bridge-text transition-colors cursor-pointer">Log in</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FeaturedCard({ business }: { business: any }) {
  const [from, to] = business.coverGradient
  const fromPrice = business.services?.length
    ? Math.min(...business.services.map((s: { price: number }) => s.price))
    : null

  return (
    <Link
      href={`/glowwithsara/${business.slug}`}
      className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2 rounded-card"
    >
      <Card variant="interactive" className="p-0 overflow-hidden">
        <div className="relative aspect-[4/5]">
          {business.coverPhotoUrl ? (
            <>
              <img src={business.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
          )}
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-bridge-secondary text-micro px-2.5 py-1 rounded-badge">
              {business.category}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-display text-white font-bold text-base leading-tight drop-shadow-sm line-clamp-2">
              {business.name}
            </h3>
          </div>
        </div>
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-caption text-bridge-muted min-w-0">
            {business.rating > 0 && (
              <>
                <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                <span className="font-semibold text-bridge-secondary">{business.rating}</span>
              </>
            )}
            {business.location && (
              <span className="truncate flex items-center gap-0.5">
                <MapPin size={9} className="flex-shrink-0" />
                {business.location.split(',')[0]}
              </span>
            )}
          </div>
          {fromPrice !== null && (
            <span className="text-bridge-accent font-bold text-caption flex-shrink-0">฿{fromPrice.toLocaleString()}+</span>
          )}
        </div>
      </Card>
    </Link>
  )
}

function HowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <span className="font-display text-caption font-bold text-bridge-accent tracking-wide">{n}</span>
      <div className="w-8 h-px bg-bridge-accent/30 mt-2.5 mb-4" />
      <p className="font-semibold text-bridge-heading text-title mb-2">{title}</p>
      <p className="text-bridge-muted text-body leading-relaxed max-w-xs">{body}</p>
    </div>
  )
}
