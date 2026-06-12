import Link from 'next/link'
import { Megaphone, Coins, LineChart } from 'lucide-react'
import { BusinessService } from '@/services/business.service'
import { Button } from '@/components/ui/Button'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import HomeExperiences from '@/components/HomeExperiences'

export default async function Home() {
  const businesses = await BusinessService.list()

  return (
    <div className="min-h-screen bg-bridge-bg">
      {/* Hero — book experiences with live category filters */}
      <HomeExperiences businesses={businesses} />

      {/* How it works — editorial layout, not three equal columns */}
      <section className="max-w-5xl mx-auto mt-20 sm:mt-32 px-5 sm:px-6">
        <AnimateOnScroll>
          <h2 className="font-display text-heading text-bridge-heading max-w-md mb-12 sm:mb-16">
            From scrolling to your confirmed booking in seconds.
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-y-10 sm:gap-x-8">
          <AnimateOnScroll delay={0} className="sm:col-span-4">
            <HowStep
              num="01"
              title="Discover"
              body="Browse top-rated salons, spas, and studios — or follow a link from a creator you trust."
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
              title="Show up & enjoy"
              body="Get instant confirmation and reminders. Just turn up — your bookings live in one place for easy rebooking."
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
          <div className="max-w-2xl">
            <span className="font-display font-bold text-caption tracking-wider text-bridge-accent uppercase">
              Become a creator
            </span>
            <h3 className="font-display text-heading text-bridge-heading leading-tight mt-3">
              Already recommending the spots you love? Get paid for it<span className="text-bridge-accent">.</span>
            </h3>
            <p className="text-bridge-secondary text-body mt-3 mb-10 max-w-lg">
              A creator is anyone who shares places worth visiting. Add your favourite salons, spas, and studios
              to your PLOI profile, share your link, and earn commission every time someone books through it.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-8 mb-10">
              <CreatorPerk
                icon={<Megaphone size={18} />}
                title="Share what you love"
                body="Add the salons, spas, and studios you rate to your own creator profile."
              />
              <CreatorPerk
                icon={<Coins size={18} />}
                title="Earn on every booking"
                body="10% on first bookings, 5% on repeats. No minimums, paid monthly."
              />
              <CreatorPerk
                icon={<LineChart size={18} />}
                title="See your impact"
                body="A dashboard shows exactly which bookings your recommendations drove."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <Link href="/onboard/creator" className="flex-1">
                <Button size="lg" className="w-full cursor-pointer">
                  Become a creator
                </Button>
              </Link>
              <Link href="/onboard/business" className="flex-1">
                <Button variant="secondary" size="lg" className="w-full cursor-pointer">
                  List your business
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
              <p className="text-caption text-bridge-muted mt-1">Book Bangkok&rsquo;s best beauty &amp; wellness</p>
            </div>
            <div className="flex items-center gap-6 text-caption text-bridge-muted">
              <Link href="/onboard/creator" className="hover:text-bridge-text transition-colors cursor-pointer">Creators</Link>
              <Link href="/business" className="hover:text-bridge-text transition-colors cursor-pointer">Businesses</Link>
              <Link href="/login" className="hover:text-bridge-text transition-colors cursor-pointer">Log in</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function CreatorPerk({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="w-9 h-9 rounded-lg bg-bridge-accent-wash flex items-center justify-center text-bridge-accent mb-3">
        {icon}
      </div>
      <p className="font-display font-semibold text-bridge-heading text-body mb-1">{title}</p>
      <p className="text-bridge-muted text-caption leading-relaxed">{body}</p>
    </div>
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
