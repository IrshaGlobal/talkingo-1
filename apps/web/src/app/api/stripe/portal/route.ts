import { NextRequest, NextResponse } from 'next/server'
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
    const { verifyAuth } = await import('@/lib/api/auth-guard')
    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, jwt } = auth

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

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}?billing=updated`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/portal] Error:', err.message)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
