import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { PLANS, type PlanId } from '@/lib/stripe/plans'
import { getSubscription } from '@/lib/appwrite-server'
import { syncSubscriptionToAppwrite } from '@/lib/stripe/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/change-plan
 *
 * Switch an active subscription to a different plan (e.g., monthly → yearly).
 *
 * Body: { plan: 'monthly' | 'yearly' }
 *
 * Behavior:
 *   - Replaces the recurring line item with the new plan's price
 *   - Removes any one-time line items (e.g. trial fee left over from initial checkout)
 *   - Uses `proration_behavior: 'always_invoice'` so the user is charged/credited
 *     for the difference immediately and the next invoice is clean
 *   - Idempotent — switching to the same plan returns success without any change
 */

const ALLOWED_PLANS: PlanId[] = ['monthly', 'yearly']

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

    const rl = checkRateLimit(`stripe:change:${userId}`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { plan } = body as { plan?: string }
    if (!plan || !ALLOWED_PLANS.includes(plan as PlanId)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    const targetPlan = PLANS[plan as PlanId]

    const sub = await getSubscription(userId, jwt)
    if (!sub || !sub.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'no_subscription', message: 'No subscription to change.' },
        { status: 404 }
      )
    }

    if (sub.plan === plan) {
      return NextResponse.json({
        status: sub.status,
        plan: sub.plan,
        unchanged: true,
      })
    }

    // Fetch the live subscription to find the recurring item id
    const liveSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)

    const recurringItem = liveSub.items.data.find((it) => !!it.price?.recurring)
    if (!recurringItem) {
      return NextResponse.json(
        { error: 'No recurring item to update on this subscription.' },
        { status: 500 }
      )
    }

    // Build the items update: replace the recurring item, remove any non-recurring leftovers
    const items: import('stripe').Stripe.SubscriptionUpdateParams.Item[] = [
      {
        id: recurringItem.id,
        price: targetPlan.recurringPriceId,
        quantity: 1,
      },
    ]
    for (const it of liveSub.items.data) {
      if (it.id !== recurringItem.id) {
        items.push({ id: it.id, deleted: true })
      }
    }

    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items,
      proration_behavior: 'always_invoice',
      metadata: { ...liveSub.metadata, plan: targetPlan.id },
    })

    await syncSubscriptionToAppwrite({
      userId,
      customerId: sub.stripeCustomerId!,
      subscription: updated,
    })

    return NextResponse.json({
      status: updated.status,
      plan: targetPlan.id,
      currentPeriodEnd: (updated as any).current_period_end
        ? (updated as any).current_period_end * 1000
        : null,
    })
  } catch (err: any) {
    console.error('[stripe/change-plan] Error:', err.message)
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 })
  }
}
