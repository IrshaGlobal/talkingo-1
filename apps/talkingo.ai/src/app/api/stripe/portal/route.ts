import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { getSubscription } from '@/lib/appwrite-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Creates a Stripe Customer Portal session.
 * User can manage their subscription (cancel, upgrade, update payment method).
 *
 * Security: the customerId is always derived from the authenticated user's
 * subscription doc — never trusted from the request body. This means a user
 * cannot open another user's billing portal, and stale localStorage values
 * on the client don't break the flow.
 */

export async function POST(req: NextRequest) {
  try {
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

    // Rate limit: 5 portal opens per minute per user
    const rl = checkRateLimit(`stripe:portal:${userId}`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Look up the user's subscription server-side (source of truth).
    // Read as the user (their JWT) so per-document permissions apply.
    const subscription = await getSubscription(userId, jwt)
    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'no_subscription', message: 'No subscription on file. Subscribe first.' },
        { status: 404 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Try landing directly on payment-method update; fall back to generic
    // portal if the flow isn't enabled in the Stripe Dashboard.
    let session: Stripe.BillingPortal.Session
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${appUrl}?billing=updated`,
        flow_data: {
          type: 'payment_method_update',
        },
      })
    } catch (err: any) {
      if (err?.code === 'billing_portal_configuration_incomplete') {
        session = await stripe.billingPortal.sessions.create({
          customer: subscription.stripeCustomerId,
          return_url: `${appUrl}?billing=updated`,
        })
      } else {
        throw err
      }
    }

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/portal] Error:', err.message)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
