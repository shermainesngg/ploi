/**
 * Transactional email via the Resend REST API (no SDK dependency).
 *
 * Mirrors the `isSupabaseConfigured()` pattern: when RESEND_API_KEY is absent
 * the app runs fine and emails become silent no-ops, so local dev and demos
 * never depend on an email account.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Resend's shared test sender — works out of the box, delivers only to the account owner. */
const DEFAULT_FROM = 'PLOI <onboarding@resend.dev>'

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

/**
 * Send one email. Never throws — notifications must never break a booking
 * flow. Returns true if the provider accepted the message.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) return false
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[email] Resend rejected "${subject}" to ${to}: ${res.status} ${body}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err)
    return false
  }
}
