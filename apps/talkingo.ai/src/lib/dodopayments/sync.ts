import 'server-only'

/**
 * DodoPayments → Appwrite subscription sync.
 *
 * Placeholder for the full DodoPayments webhook + post-checkout sync logic.
 * Will be used by:
 *   - The DodoPayments webhook handler (real-time events)
 *   - The post-checkout sync endpoint (immediately after user returns)
 *   - Cancel/upgrade endpoints (user actions in our UI)
 *
 * Pattern mirrors src/lib/stripe/sync.ts — same Appwrite destination,
 * different source provider.
 */

import { upsertSubscription, updateUserPrefs, logSubscriptionEvent } from '@/lib/appwrite-server'

export type DodoStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'incomplete'
  | 'incomplete_expired'

export interface DodoSubscriptionInfo {
  id: string
  customerId: string
  status: DodoStatus
  plan: 'monthly' | 'yearly'
  trialEnd?: number
  periodEnd?: number
  cancelAtPeriodEnd: boolean
}

/**
 * Persist a DodoPayments subscription's current state into Appwrite.
 * Writes both the `subscriptions` collection and the user's Account Prefs.
 *
 * Called by the DodoPayments webhook and post-checkout sync endpoint.
 */
export async function syncDodoSubscriptionToAppwrite(params: {
  userId: string
  customerId: string
  subscription: DodoSubscriptionInfo
}): Promise<void> {
  const { userId, customerId, subscription } = params

  const now = Date.now()

  await upsertSubscription(userId, {
    dodopaymentsCustomerId: customerId,
    dodopaymentsSubscriptionId: subscription.id,
    provider: 'dodopayments',
    status: subscription.status,
    plan: subscription.plan,
    trialEnd: subscription.trialEnd,
    periodEnd: subscription.periodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    updatedAt: now,
  })

  await updateUserPrefs(userId, {
    dodopaymentsCustomerId: customerId,
    dodopaymentsSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionPlan: subscription.plan,
    ...(subscription.trialEnd && { subscriptionTrialEnd: subscription.trialEnd }),
    ...(subscription.periodEnd && { subscriptionPeriodEnd: subscription.periodEnd }),
    subscriptionUpdatedAt: now,
  })

  // Audit log: record every state change for support & reconciliation
  logSubscriptionEvent({
    userId,
    eventType: 'dodopayments_subscription_synced',
    stripeEventId: subscription.id,
    subscriptionId: subscription.id,
    customerId,
    newStatus: subscription.status,
    plan: subscription.plan,
    timestamp: now,
  }).catch(() => {}) // fire-and-forget
}
