import Link from 'next/link'
import {
  CalendarDays, Users, BellRing, Link2, ArrowRight, Check,
} from 'lucide-react'
import { PloiMark, PoweredByPloi } from '@/components/ui/Logo'

/* ────────────────────────────────────────────────────────────────────────────
   Mock artifacts — small renditions of the real product, with realistic data.
   They sell the page better than any illustration could.
──────────────────────────────────────────────────────────────────────────── */

function AgendaArtifact() {
  const rows = [
    { time: '10:00', name: 'Ploy N.', service: 'Signature Glow Facial', status: 'confirmed' },
    { time: '11:30', name: 'Mind K.', service: 'Hydra Boost', status: 'confirmed' },
    { time: '13:00', name: 'Walk-in', service: 'Express Glow', status: 'walkin' },
    { time: '15:30', name: 'Fern S.', service: 'Signature Glow Facial', status: 'pending' },
  ]
  return (
    <div className="bg-bridge-card rounded-2xl border border-bridge-border shadow-card overflow-hidden select-none" aria-hidden="true">
      <div className="px-4 py-3 border-b border-bridge-border/60 flex items-baseline justify-between">
        <p className="text-label font-bold text-bridge-heading">Today</p>
        <p className="font-data text-micro text-bridge-muted tracking-tight">THU 4 JUN</p>
      </div>
      <div className="divide-y divide-bridge-border/60">
        {rows.map((r) => (
          <div key={r.time} className="px-4 py-2.5 flex items-center gap-3">
            <span className="font-data text-caption text-bridge-muted tracking-tight w-11">{r.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-label text-bridge-heading truncate">{r.name}</p>
              <p className="text-micro font-medium text-bridge-muted truncate">{r.service}</p>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                r.status === 'confirmed'
                  ? 'bg-green-100 text-green-700'
                  : r.status === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-bridge-surface text-bridge-secondary'
              }`}
            >
              {r.status === 'walkin' ? 'walk-in' : r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AttributionArtifact() {
  return (
    <div className="bg-bridge-card rounded-2xl border border-bridge-border shadow-card overflow-hidden select-none" aria-hidden="true">
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label font-bold text-bridge-heading truncate">Signature Glow Facial</p>
            <p className="text-micro font-medium text-bridge-muted mt-0.5">New customer · Ploy N.</p>
          </div>
          <span className="font-data text-label text-bridge-heading tracking-tight flex-shrink-0">฿1,890</span>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-bridge-border/60">
          <span className="w-6 h-6 rounded-full bg-bridge-accent text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">S</span>
          <p className="text-caption text-bridge-secondary min-w-0 truncate">
            via <span className="font-semibold text-bridge-heading">@glowwithsara</span> · TikTok
          </p>
          <span className="font-data text-micro text-bridge-accent tracking-tight ml-auto flex-shrink-0">+฿189 creator</span>
        </div>
      </div>
      <div className="px-4 py-2 bg-bridge-surface/60 flex items-center justify-between">
        <span className="text-micro font-semibold text-bridge-muted uppercase tracking-widest">You keep</span>
        <span className="font-data text-label text-bridge-heading tracking-tight">฿1,606 · 85%</span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'A calendar that runs the day',
    body: 'Day, week, and month views. Every booking lands in the right slot — no double-booking, no flipping pages.',
  },
  {
    icon: Users,
    title: 'Staff schedules built in',
    body: 'Per-staff hours, services, and time blocks. Customers book the right person at the right time.',
  },
  {
    icon: BellRing,
    title: 'Requests that never rot',
    body: 'New bookings arrive by email. Confirm or decline in one tap — your customer hears back instantly.',
  },
  {
    icon: Link2,
    title: 'A booking page worth sharing',
    body: 'Your services, photos, and hours on one fast page. Drop the link in your bio, LINE, or a creator’s post.',
  },
]

const STEPS = [
  { n: '01', title: 'Create your page', body: 'Name, services, hours, photos. Five minutes, from your phone.' },
  { n: '02', title: 'Take bookings', body: 'Share your link anywhere. Walk-ins and direct bookings are always free.' },
  { n: '03', title: 'Let creators sell for you', body: 'Approve creator links and watch attributed bookings arrive — with proof of who sent them.' },
]

export default function BusinessLanding() {
  return (
    <div className="bg-bridge-bg">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-bridge-border/40 bg-bridge-card">
        <div className="max-w-5xl mx-auto px-5 pt-16 pb-14 sm:pt-24 sm:pb-20 grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-block font-display font-bold text-caption tracking-widest text-bridge-accent uppercase mb-5">
              For salons, spas &amp; studios
            </span>

            <h1 className="font-display text-display text-bridge-heading max-w-2xl">
              The booking book that knows who sent the customer<span className="text-bridge-accent">.</span>
            </h1>

            <p className="text-body-lg text-bridge-secondary max-w-xl mt-6">
              PLOI replaces the paper diary with a booking system your customers can use —
              and tells you exactly which creator drove every new face through the door.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link
                href="/onboard/business"
                className="inline-flex items-center gap-2 bg-bridge-ink text-bridge-ink-foreground font-semibold text-body px-6 py-3.5 rounded-2xl hover:bg-bridge-ink-hover active:scale-[0.98] transition-all"
              >
                Create your booking page <ArrowRight size={16} />
              </Link>
              <a
                href="#pricing"
                className="text-label font-semibold text-bridge-secondary hover:text-bridge-heading px-3 py-3 transition-colors"
              >
                See what it costs
              </a>
            </div>

            <p className="font-data text-caption text-bridge-muted tracking-tight mt-6">
              No monthly fee · Direct bookings &amp; walk-ins free, forever
            </p>
          </div>

          <div>
            <AgendaArtifact />
            <p className="text-micro font-medium text-bridge-muted mt-3 text-center">
              Your day, as PLOI sees it
            </p>
          </div>
        </div>
      </section>

      {/* ─── The diary, upgraded ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-16 sm:py-24">
        <h2 className="font-display text-heading text-bridge-heading max-w-md">
          Everything the paper diary does. Plus everything it can&rsquo;t.
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10 mt-12 max-w-4xl">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <f.icon size={18} className="text-bridge-heading flex-shrink-0 mt-1" strokeWidth={2.2} />
              <div>
                <h3 className="text-title font-bold text-bridge-heading">{f.title}</h3>
                <p className="text-body text-bridge-secondary mt-1.5">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Attribution (dark band) ──────────────────────────────────────── */}
      <section className="bg-bridge-ink-static">
        <div className="max-w-5xl mx-auto px-5 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-center">
            <div>
              <span className="inline-block font-display font-bold text-caption tracking-widest text-bridge-accent uppercase mb-5">
                Creator attribution
              </span>
              <h2 className="font-display text-heading text-white max-w-lg">
                Stop guessing where new customers come from.
              </h2>
              <div className="mt-8 space-y-5 max-w-lg">
                {[
                  'A creator posts about your place and adds their PLOI link.',
                  'Their followers tap it and book — on your page, into your calendar.',
                  'Every attributed booking shows the creator, the content, and the numbers.',
                ].map((line, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="font-data text-caption text-white/40 tracking-tight flex-shrink-0 mt-0.5">
                      0{i + 1}
                    </span>
                    <p className="text-body-lg text-white/80">{line}</p>
                  </div>
                ))}
              </div>
              <p className="text-body text-white/60 max-w-lg mt-8">
                Word of mouth has always been your best marketing. PLOI is the first time
                you can see it — and reward it — booking by booking.
              </p>
            </div>

            <div>
              <AttributionArtifact />
              <p className="text-micro font-medium text-white/40 mt-3 text-center">
                An attributed booking, as your dashboard shows it
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ledger ───────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-5xl mx-auto px-5 py-16 sm:py-24 scroll-mt-16">
        <h2 className="font-display text-heading text-bridge-heading">
          Pay only when a creator brings you a customer.
        </h2>
        <p className="text-body-lg text-bridge-secondary max-w-xl mt-4">
          No subscription. No setup fee. Commission applies to creator-attributed bookings only —
          everything else is yours.
        </p>

        <div className="mt-10 bg-bridge-card rounded-2xl border border-bridge-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_repeat(3,5.5rem)] gap-x-4 px-5 py-3 border-b border-bridge-border bg-bridge-surface/60">
            <span className="text-micro font-semibold text-bridge-muted uppercase tracking-widest">Booking type</span>
            <span className="hidden sm:block text-micro font-semibold text-bridge-muted uppercase tracking-widest text-right">Creator</span>
            <span className="hidden sm:block text-micro font-semibold text-bridge-muted uppercase tracking-widest text-right">PLOI</span>
            <span className="text-micro font-semibold text-bridge-muted uppercase tracking-widest text-right">You keep</span>
          </div>

          {[
            { label: 'First booking via a creator link', sub: 'A brand-new customer, sent by a creator', creator: '10%', ploi: '5%', keep: '85%' },
            { label: 'Repeat booking within 6 months', sub: 'The same customer comes back', creator: '5%', ploi: '5%', keep: '90%' },
            { label: 'Direct bookings & walk-ins', sub: 'Customers you brought yourself', creator: '—', ploi: '—', keep: '100%', free: true },
          ].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_repeat(3,5.5rem)] gap-x-4 items-center px-5 py-4 border-b border-bridge-border/60 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-label font-semibold text-bridge-heading">{row.label}</p>
                <p className="text-caption text-bridge-muted mt-0.5">{row.sub}</p>
                <p className="sm:hidden font-data text-micro text-bridge-muted tracking-tight mt-1.5">
                  {row.free ? 'No commission' : `creator ${row.creator} · PLOI ${row.ploi}`}
                </p>
              </div>
              <span className="hidden sm:block font-data text-body text-bridge-secondary tracking-tight text-right">{row.creator}</span>
              <span className="hidden sm:block font-data text-body text-bridge-secondary tracking-tight text-right">{row.ploi}</span>
              <span className={`font-data text-body tracking-tight text-right font-bold ${row.free ? 'text-bridge-accent' : 'text-bridge-heading'}`}>
                {row.keep}
              </span>
            </div>
          ))}
        </div>

        <p className="font-data text-caption text-bridge-muted tracking-tight mt-4">
          Commission is taken at payout — never an invoice to chase.
        </p>
      </section>

      {/* ─── Three steps ──────────────────────────────────────────────────── */}
      <section className="border-t border-bridge-border/40 bg-bridge-card">
        <div className="max-w-5xl mx-auto px-5 py-16 sm:py-20">
          <h2 className="font-display text-heading text-bridge-heading">Up and running this afternoon.</h2>
          <div className="grid sm:grid-cols-3 gap-10 sm:gap-8 mt-10 max-w-4xl">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="font-data text-caption text-bridge-accent tracking-tight">{s.n}</span>
                <h3 className="text-title font-bold text-bridge-heading mt-2">{s.title}</h3>
                <p className="text-body text-bridge-secondary mt-1.5">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-12">
            {['Free booking page', 'Email notifications', 'Stripe payments', 'Creator dashboard'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-caption text-bridge-secondary">
                <Check size={13} className="text-bridge-accent" strokeWidth={2.5} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-bridge-ink-static relative overflow-hidden">
        <PloiMark
          size={420}
          className="absolute -right-16 -bottom-24 text-white/[0.04] pointer-events-none hidden sm:block"
        />
        <div className="max-w-5xl mx-auto px-5 py-16 sm:py-24 relative">
          <h2 className="font-display text-heading text-white max-w-lg">
            Your diary won&rsquo;t miss you.
          </h2>
          <p className="text-body-lg text-white/70 max-w-md mt-4">
            Set up your booking page in five minutes — free until a creator earns you a customer.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-9">
            <Link
              href="/onboard/business"
              className="inline-flex items-center gap-2 bg-white text-[#0D1117] font-semibold text-body px-6 py-3.5 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Create your booking page <ArrowRight size={16} />
            </Link>
            <Link href="/login/business" className="text-label font-semibold text-white/70 hover:text-white transition-colors">
              Already on PLOI? Log in
            </Link>
          </div>
          <div className="mt-14">
            <PoweredByPloi className="[&_span]:!text-white/50 [&_svg]:!text-white/50" />
          </div>
        </div>
      </section>
    </div>
  )
}
