'use client'

import Link from 'next/link'
import { Inbox } from 'lucide-react'
import type { AgendaBooking } from '@/lib/db'
import BookingActionCard, { type StaffSummary } from '../BookingActionCard'

const STATUSES: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

interface Props {
  bookings: AgendaBooking[]
  status: string
  staff: StaffSummary[]
  businessSlug: string
}

export default function BookingsTab({ bookings, status, staff, businessSlug }: Props) {
  return (
    <div>
      {/* Status filter chips */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto -mx-1 px-1 pb-1">
        {STATUSES.map((s) => {
          const active = (status === 'all' && s.key === 'all') || status === s.key
          const count = s.key === 'all'
            ? bookings.length
            : bookings.filter((b) => b.status === s.key).length
          return (
            <Link
              key={s.key}
              href={`/dashboard/business/${businessSlug}?tab=bookings&status=${s.key}`}
              scroll={false}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {s.label}
              <span className={`text-[10px] font-bold ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-50 mb-3">
            <Inbox size={20} className="text-stone-400" />
          </div>
          <p className="text-stone-500 text-sm">
            {status === 'all' ? 'No bookings yet.' : `No ${status} bookings.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <BookingActionCard
              key={b.id}
              booking={b}
              staff={staff}
              businessSlug={businessSlug}
              showDate
            />
          ))}
        </div>
      )}
    </div>
  )
}
