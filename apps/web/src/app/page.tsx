import Link from 'next/link'
import { ArrowRight, Sparkles, Calendar, Wallet, Star, MapPin } from 'lucide-react'
import { listBusinesses } from '@/lib/db'

export default async function Home() {
  const businesses = await listBusinesses()
  const featured = businesses.slice(0, 6)

  return (
    <div className="bg-stone-50">
      <div className="max-w-[480px] mx-auto pb-16">

        {/* Hero */}
        <section className="px-5 pt-10 pb-8 text-center">
          <span className="inline-block text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full mb-4">
            ✨ Bangkok&apos;s creator-curated bookings
          </span>
          <h1 className="text-[2.4rem] leading-[1.1] font-black text-stone-900 tracking-tight mb-4">
            Book local experiences{' '}
            <span className="bg-gradient-to-br from-rose-500 to-orange-400 bg-clip-text text-transparent">
              recommended by creators
            </span>{' '}
            you trust.
          </h1>
          <p className="text-stone-500 text-sm max-w-xs mx-auto mb-7">
            See it on TikTok. Tap. Book. Done.
          </p>

          <div className="flex gap-2">
            <a
              href="#featured"
              className="flex-1 py-3.5 rounded-2xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              Find a place <ArrowRight size={15} />
            </a>
            <Link
              href="/signup"
              className="flex-1 py-3.5 rounded-2xl bg-white border border-stone-200 text-stone-900 font-semibold text-sm hover:border-stone-900 active:scale-[0.98] transition-all"
            >
              Join as creator
            </Link>
          </div>
        </section>

        {/* Featured businesses */}
        <section id="featured" className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest">
              Featured places
            </h2>
            <span className="text-xs text-stone-400">{featured.length}</span>
          </div>

          {featured.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-12">No businesses listed yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {featured.map((b) => <FeaturedCard key={b.id} business={b} />)}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="mt-12 px-4">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4 px-1">
            How it works
          </h2>
          <div className="space-y-3">
            <HowStep
              n="1"
              icon={<Sparkles size={18} />}
              title="Discover via creators"
              body="Find spots through TikToks and Reels you already trust."
            />
            <HowStep
              n="2"
              icon={<Calendar size={18} />}
              title="Book instantly"
              body="One tap from the creator's link to a confirmed appointment."
            />
            <HowStep
              n="3"
              icon={<Wallet size={18} />}
              title="Creators earn"
              body="The creator who recommended the spot earns a commission. Everyone wins."
            />
          </div>
        </section>

        {/* CTAs */}
        <section className="mt-12 px-4">
          <div className="bg-stone-900 text-white rounded-3xl p-6 text-center">
            <h3 className="text-xl font-black leading-tight">Are you a business or creator?</h3>
            <p className="text-stone-300 text-sm mt-2 mb-5">Get on BRIDGE in under 10 minutes.</p>
            <div className="flex gap-2">
              <Link
                href="/onboard/business"
                className="flex-1 py-3 rounded-xl bg-white text-stone-900 font-semibold text-sm hover:bg-stone-100"
              >
                List your business
              </Link>
              <Link
                href="/onboard/creator"
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700"
              >
                Join as creator
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 px-5 text-center text-xs text-stone-400 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Link href="/onboard/creator" className="hover:text-stone-700">Creators</Link>
            <span>·</span>
            <Link href="/onboard/business" className="hover:text-stone-700">Businesses</Link>
            <span>·</span>
            <Link href="/login" className="hover:text-stone-700">Log in</Link>
          </div>
          <p>BRIDGE · Bangkok · MVP</p>
        </footer>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FeaturedCard({ business }: { business: any }) {
  const [from, to] = business.coverGradient
  const top = business.services?.[0]
  const fromPrice = business.services?.length
    ? Math.min(...business.services.map((s: { price: number }) => s.price))
    : null

  return (
    <Link
      href={`/glowwithsara/${business.slug}`}
      className="block bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[4/3]">
        {business.coverPhotoUrl ? (
          <>
            <img src={business.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
            {business.category}
          </span>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{business.name}</h3>
        </div>
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-stone-500 min-w-0">
          {business.rating > 0 && (
            <>
              <Star size={10} className="fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="font-semibold text-stone-700">{business.rating}</span>
            </>
          )}
          {business.location && <span className="truncate">· {business.location.split(',')[0]}</span>}
        </div>
        {fromPrice !== null && (
          <span className="text-rose-600 font-bold text-[11px] flex-shrink-0">฿{fromPrice.toLocaleString()}+</span>
        )}
      </div>
    </Link>
  )
}

function HowStep({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 flex items-start gap-3 shadow-sm">
      <div className="flex-shrink-0 relative">
        <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">{icon}</div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-900 text-white text-[10px] font-bold flex items-center justify-center">
          {n}
        </div>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-stone-900 text-sm">{title}</p>
        <p className="text-stone-500 text-xs leading-relaxed mt-0.5">{body}</p>
      </div>
    </div>
  )
}
