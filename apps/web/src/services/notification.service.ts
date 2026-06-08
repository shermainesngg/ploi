import { BookingRepo } from '@/repositories/booking.repo'
import { isEmailConfigured, sendEmail } from '@/lib/email'

/**
 * Booking notification emails.
 *
 * Every method is fire-safe: it catches and logs its own errors so a failed
 * (or unconfigured) email can never break a booking flow.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Supabase embeds can come back as a single object or a 1-element array. */
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

interface EmailRow {
  label: string
  value: string
}

/**
 * Minimal brand-consistent email shell: warm white canvas, ink text,
 * monospace for data rows, coral only for the booking CTA.
 */
function renderEmail(opts: {
  heading: string
  intro: string
  rows: EmailRow[]
  cta?: { label: string; url: string }
}): string {
  const rowsHtml = opts.rows
    .map(
      (r) => `
        <tr>
          <td style="padding:6px 16px 6px 0;color:#6B6B6B;font-size:13px;white-space:nowrap;">${r.label}</td>
          <td style="padding:6px 0;color:#0D1117;font-size:13px;font-family:'Space Mono',ui-monospace,monospace;">${r.value}</td>
        </tr>`,
    )
    .join('')

  const ctaHtml = opts.cta
    ? `<a href="${opts.cta.url}" style="display:inline-block;margin-top:24px;background:#E05A47;color:#FAF9F6;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${opts.cta.label}</a>`
    : ''

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FAF9F6;font-family:'Plus Jakarta Sans',-apple-system,'Segoe UI',sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
      <p style="margin:0 0 24px;font-size:15px;font-weight:700;letter-spacing:0.08em;color:#0D1117;">PLOI</p>
      <div style="background:#FFFFFF;border:1px solid #E8E4DE;border-radius:16px;padding:28px 24px;">
        <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0D1117;">${opts.heading}</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6B6B6B;">${opts.intro}</p>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rowsHtml}</table>
        ${ctaHtml}
      </div>
      <p style="margin:24px 0 0;font-size:11px;color:#6B6B6B;">Powered by PLOI · creator-to-commerce bookings</p>
    </div>
  </body>
</html>`
}

async function loadBooking(bookingId: string) {
  const row = await BookingRepo.findForNotification(bookingId)
  if (!row) return null
  const service = one(row.services)
  const business = one(row.businesses)
  if (!service || !business) return null
  return { row, service, business }
}

function bookingRows(input: {
  serviceName: string
  date: string
  time: string
  price: number
  customerName?: string
  customerEmail?: string | null
}): EmailRow[] {
  const rows: EmailRow[] = [
    { label: 'Service', value: escapeHtml(input.serviceName) },
    { label: 'Date', value: formatDate(input.date) },
    { label: 'Time', value: formatTime(input.time) },
    { label: 'Price', value: `฿${input.price.toLocaleString()}` },
  ]
  if (input.customerName) rows.push({ label: 'Customer', value: escapeHtml(input.customerName) })
  if (input.customerEmail) rows.push({ label: 'Contact', value: escapeHtml(input.customerEmail) })
  return rows
}

export const NotificationService = {
  /**
   * Email the business about a new booking. `paid: true` for Stripe-paid
   * bookings that arrive already confirmed; otherwise it's a pending request
   * that needs a confirm/decline.
   */
  async notifyBusinessNewBooking(bookingId: string, opts?: { paid?: boolean }): Promise<void> {
    if (!isEmailConfigured()) return
    try {
      const loaded = await loadBooking(bookingId)
      if (!loaded || !loaded.business.email) return
      const { row, service, business } = loaded

      const paid = opts?.paid ?? false
      await sendEmail({
        to: business.email,
        subject: paid
          ? `New paid booking — ${row.customer_name} · ${formatDate(row.booking_date)} ${formatTime(row.booking_time)}`
          : `New booking request — ${row.customer_name} · ${formatDate(row.booking_date)} ${formatTime(row.booking_time)}`,
        html: renderEmail({
          heading: paid ? 'New paid booking' : 'New booking request',
          intro: paid
            ? `Payment received — this booking is confirmed. It's on your ${escapeHtml(business.name)} calendar.`
            : `A customer just requested a booking at ${escapeHtml(business.name)}. Confirm or decline it from your dashboard.`,
          rows: bookingRows({
            serviceName: service.name,
            date: row.booking_date,
            time: row.booking_time,
            price: service.price,
            customerName: row.customer_name,
            customerEmail: row.customer_email,
          }),
          cta: {
            label: paid ? 'View booking' : 'Review booking',
            url: `${siteUrl()}/dashboard/business/${business.slug}?tab=bookings`,
          },
        }),
      })
    } catch (err) {
      console.error(`[notification] business new-booking email failed for ${bookingId}:`, err)
    }
  },

  /** Email the customer when the business confirms, declines, or cancels. */
  async notifyCustomerStatusChange(
    bookingId: string,
    status: 'confirmed' | 'declined' | 'cancelled',
  ): Promise<void> {
    if (!isEmailConfigured()) return
    try {
      const loaded = await loadBooking(bookingId)
      if (!loaded || !loaded.row.customer_email) return
      const { row, service, business } = loaded

      const copy = {
        confirmed: {
          heading: 'Booking confirmed',
          intro: `${escapeHtml(business.name)} confirmed your booking. See you there!`,
        },
        declined: {
          heading: 'Booking declined',
          intro: `Unfortunately ${escapeHtml(business.name)} couldn't take this booking. Your slot was released — pick another time whenever suits you.`,
        },
        cancelled: {
          heading: 'Booking cancelled',
          intro: `${escapeHtml(business.name)} cancelled this booking. If that's unexpected, get in touch with them directly.`,
        },
      }[status]

      await sendEmail({
        to: row.customer_email,
        subject: `${copy.heading} — ${business.name}`,
        html: renderEmail({
          heading: copy.heading,
          intro: copy.intro,
          rows: bookingRows({
            serviceName: service.name,
            date: row.booking_date,
            time: row.booking_time,
            price: service.price,
          }),
          cta: { label: 'View booking', url: `${siteUrl()}/booking-confirmed/${row.id}` },
        }),
      })
    } catch (err) {
      console.error(`[notification] customer status email failed for ${bookingId}:`, err)
    }
  },

  /** Email the business when the customer cancels their booking. */
  async notifyBusinessCancellation(bookingId: string): Promise<void> {
    if (!isEmailConfigured()) return
    try {
      const loaded = await loadBooking(bookingId)
      if (!loaded || !loaded.business.email) return
      const { row, service, business } = loaded

      await sendEmail({
        to: business.email,
        subject: `Booking cancelled — ${row.customer_name} · ${formatDate(row.booking_date)} ${formatTime(row.booking_time)}`,
        html: renderEmail({
          heading: 'Booking cancelled',
          intro: `${escapeHtml(row.customer_name)} cancelled their booking. The slot is open again.`,
          rows: bookingRows({
            serviceName: service.name,
            date: row.booking_date,
            time: row.booking_time,
            price: service.price,
            customerName: row.customer_name,
            customerEmail: row.customer_email,
          }),
          cta: {
            label: 'Open calendar',
            url: `${siteUrl()}/dashboard/business/${business.slug}?tab=calendar`,
          },
        }),
      })
    } catch (err) {
      console.error(`[notification] business cancellation email failed for ${bookingId}:`, err)
    }
  },
}
