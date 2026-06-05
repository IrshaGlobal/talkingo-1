import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { getSubscription, getAdminUsers, logSubscriptionEvent } from '@/lib/appwrite-server'
import { syncSubscriptionToAppwrite, detectPlanFromSubscription } from '@/lib/stripe/sync'

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
    const { verifyAuth, checkRateLimit, validateOrigin } = await import('@/lib/api/auth-guard')

    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }

    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, jwt } = auth

    const rl = checkRateLimit(`stripe:status:${userId}`, 30, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Body is optional — kept for backwards compat, but customerId is ignored
    // for security. We always look up the subscription owned by this user.
    try { await req.json() } catch { /* empty body is fine */ }

    // Source of truth: Appwrite subscriptions collection (written by webhook).
    // Read as the user (their JWT) so we never leak another user's row.
    const sub = await getSubscription(userId, jwt)

    // ── Recovery: no local subscription — try Stripe email lookup ─────────
    // Covers the scenario where post-checkout sync AND webhook both failed,
    // leaving the user paid on Stripe but with no Appwrite record.
    if (!sub) {
      try {
        const users = getAdminUsers()
        const appwriteUser = await users.get(userId)
        const userEmail = appwriteUser.email
        if (userEmail) {
          const customers = await stripe.customers.list({ email: userEmail, limit: 10 })
          for (const customer of customers.data) {
            const subs = await stripe.subscriptions.list({
              customer: customer.id,
              limit: 1,
              status: 'all',
            })
            if (subs.data.length > 0) {
              const live = subs.data[0]
              if (['active', 'trialing', 'past_due'].includes(live.status)) {
                await syncSubscriptionToAppwrite({ userId, customerId: customer.id, subscription: live })
                logSubscriptionEvent({
                  userId,
                  eventType: 'subscription_recovered',
                  stripeEventId: 'email_recovery',
                  subscriptionId: live.id,
                  customerId: customer.id,
                  newStatus: live.status,
                  plan: detectPlanFromSubscription(live),
                  timestamp: Date.now(),
                }).catch(() => {})
                return NextResponse.json({
                  status: live.status,
                  plan: detectPlanFromSubscription(live),
                  customerId: customer.id,
                  trialEndsAt: live.trial_end ? (live.trial_end as number) * 1000 : undefined,
                  currentPeriodEnd: (live as any).current_period_end
                    ? (live as any).current_period_end * 1000
                    : undefined,
                  cancelAtPeriodEnd: (live as any).cancel_at_period_end ?? false,
                })
              }
            }
          }
        }
      } catch (err) {
        console.warn('[stripe/status] Email recovery failed:', err)
      }
      return NextResponse.json({ status: 'none' })
    }

    // ── Live Stripe check: run for any subscription with a customerId ────
    // Catches both: out-of-band changes (portal, cancellations) and
    // corrupted DB states where status doesn't match Stripe's truth.
    // Previously this only ran for active/trialing — now catches all statuses.
    if (sub.stripeCustomerId) {


      try {
        // If subscriptionId is missing, recover from Stripe by customer lookup
        let subscriptionId = sub.stripeSubscriptionId
        if (!subscriptionId) {
          const subs = await stripe.subscriptions.list({
            customer: sub.stripeCustomerId,
            limit: 1,
            status: 'all',
          })
          if (subs.data.length > 0) {
            subscriptionId = subs.data[0].id
          }
        }

        if (subscriptionId) {
          const live = await stripe.subscriptions.retrieve(subscriptionId)
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
        }
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
