/**
 * Normalise a phone number to a canonical form for matching.
 *
 * Strips all non-digits. Handles Thai numbers specifically:
 *   - "081 234 5678" / "0812345678"  → "66812345678"
 *   - "+66 81 234 5678" / "66812345678" → "66812345678"
 * For other numbers, returns the digit-only form.
 *
 * Returns empty string if there are no digits.
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''

  // Thai mobile (starts with 0, 10 total digits) → 66 + remainder
  if (digits.startsWith('0') && digits.length === 10) {
    return '66' + digits.slice(1)
  }
  // Already normalised Thai number (66 + 9 digits)
  if (digits.startsWith('66') && (digits.length === 11 || digits.length === 12)) {
    return digits
  }
  return digits
}
