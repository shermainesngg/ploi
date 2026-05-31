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
      {/* Hero — editorial, left-aligned, no decorative elements */}
      <section className="border-b border-bridge-border/40">
        <div className="max-w-5xl mx-auto px-5 pt-14 pb-12 sm:pt-24 sm:pb-20 lg:pt-32 lg:pb-24">
          <h1 className="font-display text-display text-bridge-heading max-w-xl">
            Book local experiences recommended by creators you trust<span className="text-bridge-accent">.</span>
          </h1>
          <p className="text-body-lg text-bridge-secondary max-w-sm mt-5 mb-10">
            Discover Bangkok&rsquo;s best salons, spas, and studios through the creators you already follow.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-sm">
            <Link href="#featured" className="flex-1">
              <Button size="lg" className="w-full gap-1.5 cursor-pointer">
                Browse places <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/onboard/creator" className="flex-1">
              <Button variant="secondary" size="lg" className="w-full cursor-pointer">
                Join as creator
              </Button>
            </Link>
          </div>

          <p className="text-body text-bridge-secondary mt-5">
            Run a salon, spa, or studio?{' '}
            <Link
              href="/onboard/business"
              className="inline-flex items-center gap-1 font-semibold text-bridge-accent hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent rounded"
            >
              List your business <ArrowRight size={14} />
            </Link>
          </p>
        </div>
      </section>

      {/* Featured businesses */}
      <section id="featured" className="max-w-5xl mx-auto px-5 sm:px-6 mt-14 sm:mt-20">
        <AnimateOnScroll>
          <div className="mb-8">
            <h2 className="font-display text-heading text-bridge-heading">
              Featured places
            </h2>
            <p className="text-body text-bridge-muted mt-1.5">Handpicked by our creator community</p>
          </div>
        </AnimateOnScroll>

        {featured.length === 0 ? (
          <p className="text-bridge-muted text-body py-16">No businesses listed yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            {featured.map((b, i) => (
              <AnimateOnScroll key={b.id} delay={i * 60}>
                <FeaturedCard business={b} />
              </AnimateOnScroll>
            ))}
          </div>
        )}
      </section>

      {/* How it works — editorial layout, not three equal columns */}
      <section className="max-w-5xl mx-auto mt-20 sm:mt-32 px-5 sm:px-6">
        <AnimateOnScroll>
          <h2 className="font-display text-heading text-bridge-heading max-w-md mb-12 sm:mb-16">
            From a creator&rsquo;s recommendation to your confirmed booking.
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-y-10 sm:gap-x-8">
          <AnimateOnScroll delay={0} className="sm:col-span-4">
            <HowStep
              num="01"
              title="Discover"
              body="A creator you follow shares a salon, spa, or studio they genuinely love. You tap their link."
            />
          </AnimateOnScroll>
          <AnimateOnScroll delay={80} className="sm:col-span-4">
            <HowStep
              num="02"
              title="Book"
              body="Pick your service, choose a time, confirm. The whole thing takes about thirty seconds."
            />
          </AnimateOnScroll>
          <AnimateOnScroll delay={160} className="sm:col-span-4">
            <HowStep
              num="03"
              title="Everyone wins"
              body="You get a great experience. The business gets a customer. The creator earns a commission."
            />
          </AnimateOnScroll>
        </div>
      </section>

      {/* CTA — warm, not dark-card-with-circle */}
      <AnimateOnScroll as="section" className="max-w-5xl mx-auto mt-20 sm:mt-32 px-5 sm:px-6">
        <div className="pt-12 sm:pt-16 relative">
          <div className="flex items-center gap-3 mb-12 sm:mb-16">
            <div className="w-8 h-0.5 bg-bridge-accent rounded-full" />
            <div className="flex-1 h-px bg-bridge-border/60" />
          </div>
          <div className="max-w-lg">
            <h3 className="font-display text-heading text-bridge-heading leading-tight">
              Are you a business or creator<span className="text-bridge-accent">?</span>
            </h3>
            <p className="text-bridge-secondary text-body mt-3 mb-8">
              Get on PLOI in under ten minutes. No setup fees.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <Link href="/onboard/business" className="flex-1">
                <Button variant="secondary" size="lg" className="w-full cursor-pointer">
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
              <span className="font-display text-lg font-bold text-bridge-heading">PLOI<span className="text-bridge-accent">.</span></span>
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
          )}
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-bridge-secondary text-micro px-2.5 py-1 rounded-badge font-medium border-l-2 border-bridge-accent">
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

function HowStep({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div>
      <span className="text-bridge-accent font-display font-bold text-caption tracking-wider">{num}</span>
      <div className="w-6 h-0.5 bg-bridge-accent/40 rounded-full mt-1.5 mb-3" />
      <p className="font-display font-semibold text-bridge-heading text-title mb-2">{title}</p>
      <p className="text-bridge-muted text-body leading-relaxed">{body}</p>
    </div>
  )
}
