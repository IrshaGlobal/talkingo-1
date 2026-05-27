import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { getSubscription } from '@/lib/appwrite-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Check subscription status for the authenticated user.
 * Called on app load to sync subscription state.
 *
 * Security: only ever queries the subscription that belongs to the
 * authenticated user (looked up from the Appwrite subscriptions collection).
 * The client cannot pass an arbitrary customerId.
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

    // Body is optional — kept for backwards compat, but customerId is ignored
    // for security. We always look up the subscription owned by this user.
    try { await req.json() } catch { /* empty body is fine */ }

    // Source of truth: Appwrite subscriptions collection (written by webhook).
    // Read as the user (their JWT) so we never leak another user's row.
    const sub = await getSubscription(userId, jwt)
    if (!sub) {
      return NextResponse.json({ status: 'none' })
    }

    // For active/trialing subs, double-check with Stripe to catch out-of-band
    // cancellations that haven't reached our webhook yet (cheap reads, no PII).
    if ((sub.status === 'active' || sub.status === 'trialing') && sub.stripeSubscriptionId) {
      try {
        const live = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
        return NextResponse.json({
          status: live.status,
          plan: sub.plan,
          customerId: sub.stripeCustomerId,
          trialEndsAt: live.trial_end ? (live.trial_end as number) * 1000 : sub.trialEnd,
          currentPeriodEnd: (live as any).current_period_end
            ? (live as any).current_period_end * 1000
            : sub.periodEnd,
          cancelAtPeriodEnd: (live as any).cancel_at_period_end ?? sub.cancelAtPeriodEnd ?? false,
        })
      } catch (stripeErr: any) {
        // Stripe lookup failed — fall back to DB
        console.warn('[stripe/status] Live lookup failed, using cached:', stripeErr?.message)
      }
    }

    return NextResponse.json({
      status: sub.status,
      plan: sub.plan,
      customerId: sub.stripeCustomerId,
      trialEndsAt: sub.trialEnd,
      currentPeriodEnd: sub.periodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    })
  } catch (err: any) {
    console.error('[stripe/status] Error:', err.message)
    return NextResponse.json({ status: 'none' })
  }
}
