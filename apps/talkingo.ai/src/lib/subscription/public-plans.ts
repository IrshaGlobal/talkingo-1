/**
 * Client-safe plan metadata.
 *
 * This is a hand-mirrored copy of `src/lib/stripe/plans.ts`'s public fields,
 * intentionally separated so client components don't accidentally import the
 * Stripe price IDs (which would be useless on the client and a noisy bundle).
 *
 * Keep these in sync with the server-side plan registry.
 */

export type PlanId = 'trial' | 'monthly' | 'yearly'

export interface PublicPlan {
  id: PlanId
  label: string
  priceLabel: string
  periodLabel: string
  savingsLabel?: string
  subtitle?: string
  pitch: string
  trialDays?: number
  sortOrder: number
}

export const PUBLIC_PLANS: Record<PlanId, PublicPlan> = {
  trial: {
    id: 'trial',
    label: '5-Day Trial',
    priceLabel: '$1',
    periodLabel: 'today',
    subtitle: 'then $7.99/mo',
    pitch: 'Try Premium for 5 days. Cancel anytime before billing.',
    trialDays: 5,
    sortOrder: 0,
  },
  monthly: {
    id: 'monthly',
    label: 'Monthly',
    priceLabel: '$7.99',
    periodLabel: '/month',
    pitch: 'Full Premium, billed monthly.',
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
    sortOrder: 2,
  },
}

export const PUBLIC_PLAN_LIST: PublicPlan[] = Object.values(PUBLIC_PLANS).sort(
  (a, b) => a.sortOrder - b.sortOrder
)
