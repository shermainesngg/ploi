import { NextRequest, NextResponse } from 'next/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'
import { authorizeCreatorDashboard } from '@/lib/ownership'

/**
 * POST /api/creators/:slug/connect-stripe
 * Creates (or reuses) a Stripe Connect Express account for the creator —
 * transfers only, so commission payouts can be sent to them — and returns an
 * onboarding link. Owner-only (unclaimed/demo creators stay open).
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

    const access = await authorizeCreatorDashboard(slug)
    if (access === 'not_found') {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }
    if (access !== 'granted') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: access === 'unauthenticated' ? 401 : 403 },
      )
    }

    const db = createServerClient()
    const { data: creator, error } = await db
      .from('creators')
      .select('id, slug, display_name, email, stripe_account_id')
      .eq('slug', slug)
      .single()

    if (error || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const stripe = getStripe()
    let accountId = creator.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'TH',
        email: creator.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: creator.display_name,
        },
      })
      accountId = account.id
      await db
        .from('creators')
        .update({ stripe_account_id: accountId })
        .eq('id', creator.id)
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/creator/${slug}?stripe_setup=refresh`,
      return_url: `${origin}/dashboard/creator/${slug}?stripe_setup=complete`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
