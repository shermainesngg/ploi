import { NextRequest, NextResponse } from 'next/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'

/**
 * POST /api/businesses/:slug/connect-stripe
 * Creates (or reuses) a Stripe Connect Express account for the business and returns
 * an onboarding link. The browser redirects the user to it; Stripe redirects back
 * to /dashboard/business/:slug?stripe_setup=complete on success.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY in .env.local.' },
      { status: 400 },
    )
  }

  try {
    const { slug } = await params
    const db = createServerClient()
    const { data: business, error } = await db
      .from('businesses')
      .select('id, slug, name, email, stripe_account_id')
      .eq('slug', slug)
      .single()

    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const stripe = getStripe()
    let accountId = business.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'TH',
        email: business.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: business.name,
        },
      })
      accountId = account.id
      await db
        .from('businesses')
        .update({ stripe_account_id: accountId })
        .eq('id', business.id)
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/business/${slug}?stripe_setup=refresh`,
      return_url: `${origin}/dashboard/business/${slug}?stripe_setup=complete`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
