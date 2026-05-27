import 'server-only'

/**
 * Authoritative Stripe → Appwrite subscription sync.
 *
 * Used by:
 *   - The webhook handler (Stripe → us, ongoing events)
 *   - The post-checkout sync endpoint (browser → us, immediately after checkout)
 *   - The cancel/upgrade endpoints (user actions in our UI)
 *
 * Both paths feed through the same `syncSubscriptionToAppwrite()` so the
 * persisted state is consistent and we never depend on the webhook firing
 * for the user to see Premium right after paying.
 */

import type Stripe from 'stripe'
import { stripe } from './client'
import { upsertSubscription, updateUserPrefs } from '@/lib/appwrite-server'
import { planIdFromRecurringPriceId } from './plans'

export type AppwriteStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'

/** Pick the recurring (subscription) line item from a subscription, skipping one-time items like the trial fee. */
export function detectPlanFromSubscription(sub: Stripe.Subscription): 'monthly' | 'yearly' {
  const recurringItem = sub.items.data.find((item) => !!item.price?.recurring)
  if (recurringItem?.price?.id) {
    const planId = planIdFromRecurringPriceId(recurringItem.price.id)
    if (planId === 'yearly') return 'yearly'
    if (planId === 'monthly' || planId === 'trial') return 'monthly'
  }
  // Fallback to interval inspection
  const interval = recurringItem?.price?.recurring?.interval
  return interval === 'year' ? 'yearly' : 'monthly'
}

/**
 * Persist a Stripe subscription's current state into Appwrite.
 * Writes both the `subscriptions` collection and the user's Account Prefs.
 */
export async function syncSubscriptionToAppwrite(params: {
  userId: string
  customerId: string
  subscription: Stripe.Subscription
}): Promise<void> {
  const { userId, customerId, subscription } = params

  const plan = detectPlanFromSubscription(subscription)
  const trialEnd = subscription.trial_end ? (subscription.trial_end as number) * 1000 : undefined
  const periodEnd = (subscription as any).current_period_end
    ? (subscription as any).current_period_end * 1000
    : undefined
  const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end ?? false

  await upsertSubscription(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    plan,
    trialEnd,
    periodEnd,
    cancelAtPeriodEnd,
    updatedAt: Date.now(),
  })

  await updateUserPrefs(userId, {
    stripeCustomerId: customerId,
    subscriptionStatus: subscription.status,
    subscriptionPlan: plan,
    ...(trialEnd && { subscriptionTrialEnd: trialEnd }),
    ...(periodEnd && { subscriptionPeriodEnd: periodEnd }),
    subscriptionUpdatedAt: Date.now(),
  })
}

/**
 * Pull a checkout session's subscription from Stripe and persist it.
 * Called from the post-checkout success URL handler so the user sees
 * Premium immediately, regardless of whether the webhook landed yet.
 *
 * Returns the synced subscription details so the calling endpoint can
 * pass them straight back to the browser.
 */
export async function syncFromCheckoutSession(params: {
  userId: string
  sessionId: string
}): Promise<{
  status: AppwriteStatus
  plan: 'monthly' | 'yearly'
  customerId: string
  subscriptionId: string
  trialEnd?: number
  periodEnd?: number
  cancelAtPeriodEnd: boolean
} | null> {
  const { userId, sessionId } = params

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  // Ownership check
  if (session.metadata?.userId !== userId) {
    throw new Error('Session does not belong to this user')
  }

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  if (!customerId || !subscriptionId) return null

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  await syncSubscriptionToAppwrite({ userId, customerId, subscription })

  return {
    status: subscription.status as AppwriteStatus,
    plan: detectPlanFromSubscription(subscription),
    customerId,
    subscriptionId,
    trialEnd: subscription.trial_end ? (subscription.trial_end as number) * 1000 : undefined,
    periodEnd: (subscription as any).current_period_end
      ? (subscription as any).current_period_end * 1000
      : undefined,
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end ?? false,
  }
}
