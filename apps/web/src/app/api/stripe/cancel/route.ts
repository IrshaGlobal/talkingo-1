import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { getSubscription } from '@/lib/appwrite-server'
import { syncSubscriptionToAppwrite } from '@/lib/stripe/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/cancel
 *
 * Cancels the authenticated user's subscription at period end.
 * They keep access until `currentPeriodEnd`, then it expires.
 *
 * Idempotent — if the subscription is already set to cancel, just refreshes state.
 */

export async function POST(req: NextRequest) {
  try {
    const { verifyAuth } = await import('@/lib/api/auth-guard')
    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, jwt } = auth

    const sub = await getSubscription(userId, jwt)
    if (!sub || !sub.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'no_subscription', message: 'No active subscription to cancel.' },
        { status: 404 }
      )
    }

    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    await syncSubscriptionToAppwrite({
      userId,
      customerId: sub.stripeCustomerId,
      subscription: updated,
    })

    return NextResponse.json({
      status: updated.status,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: (updated as any).current_period_end
        ? (updated as any).current_period_end * 1000
        : null,
    })
  } catch (err: any) {
    console.error('[stripe/cancel] Error:', err.message)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}
