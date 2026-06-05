/**
 * Subscription status management.
 *
 * Two-layer verification:
 * 1. localStorage for instant UI (no flicker on load)
 * 2. Server check on app load (syncs with Stripe via Appwrite)
 *
 * The source of truth is Stripe → Webhook → Appwrite → Client.
 * localStorage is just a cache for instant rendering.
 */

import { authFetch } from '@/lib/api/auth-fetch'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'none'

export interface SubscriptionInfo {
  status: SubscriptionStatus
  plan?: 'monthly' | 'yearly'
  customerId?: string
  trialEndsAt?: number
  currentPeriodEnd?: number
  /** True when the user has cancelled but still has access until the period end */
  cancelAtPeriodEnd?: boolean
  /** Timestamp of last server verification */
  verifiedAt?: number
}

const STORAGE_KEY = 'talkingo_subscription'
const VERIFY_INTERVAL = 1000 * 60 * 60 // Re-verify every hour

function getStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY
}

export function getSubscriptionInfo(userId?: string | null): SubscriptionInfo {
  if (typeof window === 'undefined') return { status: 'none' }
  try {
    const stored = localStorage.getItem(getStorageKey(userId))
    if (!stored) return { status: 'none' }
    return JSON.parse(stored)
  } catch {
    return { status: 'none' }
  }
}

export function saveSubscriptionInfo(info: SubscriptionInfo, userId?: string | null): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStorageKey(userId), JSON.stringify({ ...info, verifiedAt: Date.now() }))
}

export function isSubscribed(userId?: string | null): boolean {
  const info = getSubscriptionInfo(userId)
  return info.status === 'active' || info.status === 'trialing'
}

export function needsServerVerification(userId?: string | null): boolean {
  const info = getSubscriptionInfo(userId)
  if (info.status === 'none') return false // Never subscribed — no need to verify
  if (!info.verifiedAt) return true
  return Date.now() - info.verifiedAt > VERIFY_INTERVAL
}

export function clearSubscription(userId?: string | null): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getStorageKey(userId))
}

/**
 * Verify subscription status with the server.
 * Call on app load and periodically.
 */
export async function verifySubscription(userId?: string | null): Promise<SubscriptionInfo> {
  const info = getSubscriptionInfo(userId)

  try {
    const res = await authFetch('/api/stripe/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) return info

    const serverInfo = await res.json()
    if (serverInfo.status === 'none' && !info.customerId) return info

    const updated: SubscriptionInfo = {
      status: serverInfo.status || 'none',
      plan: serverInfo.plan,
      customerId: serverInfo.customerId || info.customerId,
      trialEndsAt: serverInfo.trialEndsAt,
      currentPeriodEnd: serverInfo.currentPeriodEnd,
      cancelAtPeriodEnd: serverInfo.cancelAtPeriodEnd ?? false,
      verifiedAt: Date.now(),
    }
    saveSubscriptionInfo(updated, userId)
    return updated
  } catch {
    return info
  }
}

/**
 * Sync subscription state from Appwrite Account Preferences.
 * Called on login to hydrate localStorage from the server-side source of truth.
 * This handles cross-device sync (e.g., subscribed on phone, opens on desktop).
 */
export function syncFromAccountPrefs(prefs: {
  stripeCustomerId?: string
  subscriptionStatus?: string
  subscriptionPlan?: string
  subscriptionTrialEnd?: number
  subscriptionPeriodEnd?: number
}, userId?: string | null): SubscriptionInfo {
  if (!prefs.stripeCustomerId || !prefs.subscriptionStatus) {
    return { status: 'none' }
  }

  const info: SubscriptionInfo = {
    status: (prefs.subscriptionStatus as SubscriptionStatus) || 'none',
    plan: (prefs.subscriptionPlan as 'monthly' | 'yearly') || undefined,
    customerId: prefs.stripeCustomerId,
    trialEndsAt: prefs.subscriptionTrialEnd,
    currentPeriodEnd: prefs.subscriptionPeriodEnd,
    verifiedAt: Date.now(),
  }

  saveSubscriptionInfo(info, userId)
  return info
}

/**
 * Check if subscription is in an expired/canceled state that needs re-subscribe.
 */
export function isExpired(userId?: string | null): boolean {
  const info = getSubscriptionInfo(userId)
  return info.status === 'expired' || info.status === 'canceled'
}

/**
 * Check if subscription has a payment issue.
 */
export function isPastDue(userId?: string | null): boolean {
  const info = getSubscriptionInfo(userId)
  return info.status === 'past_due'
}

// ─── Trial / period helpers (UI conversion levers) ──────────────────────────

/**
 * Days remaining in the trial. Returns null if not in trial or no trialEndsAt.
 * Floors to whole days; e.g. 1.4 days remaining → 1.
 */
export function getTrialDaysRemaining(userId?: string | null): number | null {
  const info = getSubscriptionInfo(userId)
  if (info.status !== 'trialing' || !info.trialEndsAt) return null
  const ms = info.trialEndsAt - Date.now()
  if (ms <= 0) return 0
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

/**
 * Hours remaining (used when < 1 day left, e.g. "Trial ends in 6 hours").
 */
export function getTrialHoursRemaining(userId?: string | null): number | null {
  const info = getSubscriptionInfo(userId)
  if (info.status !== 'trialing' || !info.trialEndsAt) return null
  const ms = info.trialEndsAt - Date.now()
  if (ms <= 0) return 0
  return Math.floor(ms / (60 * 60 * 1000))
}

/**
 * Pretty trial countdown for UI: "Trial ends in 4 days" / "...6 hours" / "...today".
 * Returns null if not in trial.
 */
export function getTrialCountdownLabel(userId?: string | null): string | null {
  const days = getTrialDaysRemaining(userId)
  if (days === null) return null
  if (days >= 1) return `Trial ends in ${days} day${days === 1 ? '' : 's'}`
  const hours = getTrialHoursRemaining(userId)
  if (hours === null) return null
  if (hours >= 1) return `Trial ends in ${hours} hour${hours === 1 ? '' : 's'}`
  return 'Trial ends today'
}

/**
 * Cancellation banner label for users who cancelled but still have access.
 * Returns null when there's nothing to show.
 */
export function getCancellationLabel(userId?: string | null): string | null {
  const info = getSubscriptionInfo(userId)
  if (!info.cancelAtPeriodEnd || !info.currentPeriodEnd) return null
  const ms = info.currentPeriodEnd - Date.now()
  if (ms <= 0) return null
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  if (days >= 1) return `Cancels in ${days} day${days === 1 ? '' : 's'}`
  return 'Cancels today'
}

/**
 * Format the next billing date as a human-readable string.
 */
export function getNextBillingLabel(userId?: string | null): string | null {
  const info = getSubscriptionInfo(userId)
  const ts = info.currentPeriodEnd
  if (!ts) return null
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return null
  }
}
