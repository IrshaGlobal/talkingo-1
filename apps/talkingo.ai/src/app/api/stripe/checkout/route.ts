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
    const { verifyAuth, checkRateLimit, validateOrigin } = await import('@/lib/api/auth-guard')

    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }

    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, jwt } = auth

    // Rate limit: 3 checkout sessions per minute per user (prevents abuse)
    const rl = checkRateLimit(`stripe:checkout:${userId}`, 3, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

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
    let customerId = existing?.stripeCustomerId

    // ── Pre-create Stripe Customer if not already attached ───────────────
    // Creates the Customer object BEFORE checkout so:
    //   1. Idempotency keys work correctly per-customer
    //   2. Webhook handler can resolve userId from customerId
    //   3. Portal + future checkout sessions reuse the same customer
    if (!customerId) {
      const { upsertSubscription, updateUserPrefs } = await import('@/lib/appwrite-server')
      const customer = await stripe.customers.create({
        metadata: { userId },
        ...(email ? { email } : {}),
      })
      customerId = customer.id
      // Persist immediately so webhooks can resolve userId from customerId.
      // These are blocking — if Appwrite is down we fail fast instead of
      // sending the user to Stripe with a broken local state.
      await upsertSubscription(userId, {
        stripeCustomerId: customerId,
        status: 'incomplete',
        plan: planConfig.id,
        updatedAt: Date.now(),
      })
      await updateUserPrefs(userId, { stripeCustomerId: customerId })
    }

    // Build line items: always the recurring plan, plus optional one-time fee
    const lineItems: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem[] = []

    if (planConfig.oneTimePriceId) {
      lineItems.push({ price: planConfig.oneTimePriceId, quantity: 1 })
    }

    lineItems.push({ price: planConfig.recurringPriceId, quantity: 1 })

    const subscriptionData: import('stripe').Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { userId, plan: planConfig.id },
      proration_behavior: 'none',
      ...(planConfig.trialDays ? { trial_period_days: planConfig.trialDays } : {}),
    }

    // Idempotency key: minute-granularity per user+plan prevents duplicate
    // sessions on double-click or tab-refresh. Stripe deduplicates within
    // the same customer+key combo for 24 hours.
    const idempotencyKey = `checkout_${userId}_${plan}_${Math.floor(Date.now() / 60000)}`

    const sessionParams: import('stripe').Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: customerId,
      metadata: { userId, plan: planConfig.id },
      client_reference_id: userId,
      line_items: lineItems,
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      consent_collection: {
        terms_of_service: 'required',
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      success_url: `${appUrl}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}?subscription=cancelled`,
    }

    // Enable Apple Pay / Google Pay / Link via automatic payment methods.
    // Cast to any because the Stripe SDK types may lag behind the API.
    ;(sessionParams as any).automatic_payment_methods = { enabled: true }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout] Error:', err.message)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
