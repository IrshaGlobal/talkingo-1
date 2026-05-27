/**
 * Plan registry — single source of truth for all pricing/plan metadata.
 *
 * Used by both the server (checkout, sync, upgrade) and the client (paywall,
 * profile screen) so labels, prices, and savings percentages never drift.
 *
 * Three plans:
 *   - trial   → $1 today for 5 days, then auto-converts to monthly
 *   - monthly → $7.99/month, no trial
 *   - yearly  → $59.99/year, no trial, save 37% vs monthly
 */

import { STRIPE_PRICES } from './env'

export type PlanId = 'trial' | 'monthly' | 'yearly'

export interface Plan {
  id: PlanId
  /** Short label, e.g. "Monthly" */
  label: string
  /** Headline price text, e.g. "$7.99" */
  priceLabel: string
  /** Period text under the price, e.g. "/month" */
  periodLabel: string
  /** Optional savings badge, e.g. "Save 37%" */
  savingsLabel?: string
  /** Optional subtitle below the price, e.g. "$5/mo billed yearly" */
  subtitle?: string
  /** One-line description of the plan for the paywall */
  pitch: string
  /** Stripe price id for the recurring subscription portion. Server-only. */
  recurringPriceId: string
  /** Stripe price id for the one-time trial fee, if any. Server-only. */
  oneTimePriceId?: string
  /** Trial period (days) — handled by Stripe via subscription_data.trial_period_days */
  trialDays?: number
  /** Stable order for display */
  sortOrder: number
}

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: 'trial',
    label: '5-Day Trial',
    priceLabel: '$1',
    periodLabel: 'today',
    subtitle: 'then $7.99/mo',
    pitch: 'Try Premium for 5 days. Cancel anytime before billing.',
    recurringPriceId: STRIPE_PRICES.monthly,
    oneTimePriceId: STRIPE_PRICES.trial,
    trialDays: 5,
    sortOrder: 0,
  },
  monthly: {
    id: 'monthly',
    label: 'Monthly',
    priceLabel: '$7.99',
    periodLabel: '/month',
    pitch: 'Full Premium, billed monthly.',
    recurringPriceId: STRIPE_PRICES.monthly,
    sortOrder: 1,
  },
  yearly: {
    id: 'yearly',
    label: 'Yearly',
    priceLabel: '$59.99',
    periodLabel: '/year',
    subtitle: '$5/mo billed yearly',
    savingsLabel: 'Save 37%',
    pitch: 'Best value. Pay once, learn all year.',
    recurringPriceId: STRIPE_PRICES.yearly,
    sortOrder: 2,
  },
}

/** All plans in display order */
export const PLAN_LIST: Plan[] = Object.values(PLANS).sort((a, b) => a.sortOrder - b.sortOrder)

/**
 * Public-safe plan info (no Stripe price IDs). Use this for client components.
 * Importing the full PLANS object from a client file is also safe, but the
 * IDs are useless in the browser anyway — Stripe price IDs aren't secrets,
 * they're just irrelevant on the client.
 */
export type PublicPlan = Omit<Plan, 'recurringPriceId' | 'oneTimePriceId'>

export function toPublicPlan(p: Plan): PublicPlan {
  const { recurringPriceId, oneTimePriceId, ...pub } = p
  return pub
}

export const PUBLIC_PLAN_LIST: PublicPlan[] = PLAN_LIST.map(toPublicPlan)

/** Resolve a recurring Stripe price id back to its plan id */
export function planIdFromRecurringPriceId(priceId: string): PlanId | null {
  for (const p of PLAN_LIST) {
    if (p.recurringPriceId === priceId) return p.id
  }
  return null
}
