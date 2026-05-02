import Link from 'next/link'
import { Sparkles, Store, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Sign up — BRIDGE',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-black tracking-tight text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">BRIDGE</span>
          <h1 className="text-3xl font-black text-stone-900 mt-6 leading-tight">I am a…</h1>
          <p className="text-stone-500 text-sm mt-2">Pick the path that fits you.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/onboard/creator"
            className="flex items-start gap-4 bg-white rounded-2xl border-2 border-rose-200 hover:border-rose-500 hover:shadow-lg active:scale-[0.99] transition-all p-5 group"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600">
              <Sparkles size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-stone-900 text-base">A creator looking to earn</p>
              <p className="text-stone-500 text-sm mt-0.5">Share spots you love. Earn 10% on every booking.</p>
            </div>
            <ArrowRight size={18} className="text-stone-400 group-hover:text-rose-600 mt-2 transition-colors flex-shrink-0" />
          </Link>

          <Link
            href="/onboard/business"
            className="flex items-start gap-4 bg-white rounded-2xl border-2 border-stone-200 hover:border-stone-900 hover:shadow-lg active:scale-[0.99] transition-all p-5 group"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 text-stone-700">
              <Store size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-stone-900 text-base">A business looking to grow</p>
              <p className="text-stone-500 text-sm mt-0.5">List your services. Get bookings driven by creator content.</p>
            </div>
            <ArrowRight size={18} className="text-stone-400 group-hover:text-stone-900 mt-2 transition-colors flex-shrink-0" />
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-200 text-center">
          <p className="text-stone-500 text-sm">
            Just want to book?{' '}
            <Link href="/" className="text-rose-600 font-semibold hover:underline">Browse places</Link>
          </p>
          <p className="text-stone-400 text-xs mt-3">
            Already have an account?{' '}
            <Link href="/login" className="text-stone-600 font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
