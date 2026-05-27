import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { PLANS, type PlanId } from '@/lib/stripe/plans'
import { getSubscription } from '@/lib/appwrite-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Creates a Stripe Checkout Session for a subscription.
 *
 * Body: { plan: 'trial' | 'monthly' | 'yearly', email?: string }
 *
 * Plan semantics:
 *   - 'trial'   → $1 today, 5 days free, then auto-charges $7.99/month
 *   - 'monthly' → $7.99/month, no trial
 *   - 'yearly'  → $59.99/year, no trial, save 37%
 *
 * Guards:
 *   - Authenticated session required (JWT)
 *   - Refuses if user already has an active/trialing subscription that isn't
 *     scheduled to cancel at period end (prevents accidental double-billing).
 */

const ALLOWED_PLANS: PlanId[] = ['trial', 'monthly', 'yearly']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { plan, email } = body as { plan?: string; email?: string }

    if (!plan || !ALLOWED_PLANS.includes(plan as PlanId)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    const planConfig = PLANS[plan as PlanId]

    // ── Auth ────────────────────────────────────────────────────────────
    const { verifyAuth } = await import('@/lib/api/auth-guard')
    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, jwt } = auth

    // ── Double-subscription guard ───────────────────────────────────────
    const existing = await getSubscription(userId, jwt)
    if (existing && (existing.status === 'active' || existing.status === 'trialing')) {
      if (!existing.cancelAtPeriodEnd) {
        return NextResponse.json(
          {
            error: 'already_subscribed',
            message:
              'You already have an active subscription. Manage it from your profile.',
          },
          { status: 409 }
        )
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const customerId = existing?.stripeCustomerId

    // Build line items: always the recurring plan, plus optional one-time fee
    const lineItems: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem[] = []

    if (planConfig.oneTimePriceId) {
      // $1 trial fee — one-time line item billed at checkout time alongside
      // the subscription. Stripe adds it to the first invoice.
      lineItems.push({ price: planConfig.oneTimePriceId, quantity: 1 })
    }

    lineItems.push({ price: planConfig.recurringPriceId, quantity: 1 })

    const subscriptionData: import('stripe').Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { userId, plan: planConfig.id },
      ...(planConfig.trialDays ? { trial_period_days: planConfig.trialDays } : {}),
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(customerId
        ? { customer: customerId }
        : email
          ? { customer_email: email }
          : {}),
      metadata: { userId, plan: planConfig.id },
      line_items: lineItems,
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false },
      success_url: `${appUrl}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}?subscription=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout] Error:', err.message)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
