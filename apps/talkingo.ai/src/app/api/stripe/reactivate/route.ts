import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { getSubscription } from '@/lib/appwrite-server'
import { syncSubscriptionToAppwrite } from '@/lib/stripe/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/reactivate
 *
 * Undoes a pending cancellation: clears `cancel_at_period_end` so the
 * subscription continues past the current period.
 *
 * Only works when the subscription is still active/trialing AND scheduled
 * to cancel. Once it has fully expired, the user must go through checkout
 * again (handled by SubscriptionExpired UI).
 */

export async function POST(req: NextRequest) {
  try {
    const { verifyAuth, checkRateLimit, validateOrigin } = await import('@/lib/api/auth-guard')

    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }

    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, jwt } = auth

    const rl = checkRateLimit(`stripe:reactivate:${userId}`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const sub = await getSubscription(userId, jwt)
    if (!sub || !sub.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'no_subscription', message: 'No subscription to reactivate.' },
        { status: 404 }
      )
    }

    if (!sub.cancelAtPeriodEnd) {
      return NextResponse.json({
        status: sub.status,
        cancelAtPeriodEnd: false,
        message: 'Subscription is already active.',
      })
    }

    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    await syncSubscriptionToAppwrite({
      userId,
      customerId: sub.stripeCustomerId!,
      subscription: updated,
    })

    return NextResponse.json({
      status: updated.status,
      cancelAtPeriodEnd: false,
    })
  } catch (err: any) {
    console.error('[stripe/reactivate] Error:', err.message)
    return NextResponse.json({ error: 'Failed to reactivate subscription' }, { status: 500 })
  }
}
