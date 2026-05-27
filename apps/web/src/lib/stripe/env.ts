/**
 * Stripe environment validation.
 *
 * Reads + validates required Stripe env vars at first import. Throws a clear
 * error if anything is missing instead of silently falling back to test-mode
 * placeholders. Import this module from any Stripe API route to fail-fast on
 * misconfiguration.
 */

const REQUIRED_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_TRIAL',
  'STRIPE_PRICE_MONTHLY',
  'STRIPE_PRICE_YEARLY',
] as const

type RequiredVar = (typeof REQUIRED_VARS)[number]

function readEnv(): Record<RequiredVar, string> {
  const missing: string[] = []
  const out = {} as Record<RequiredVar, string>

  for (const key of REQUIRED_VARS) {
    const v = process.env[key]
    if (!v || v.trim() === '' || v.startsWith('your_') || v.includes('xxx')) {
      missing.push(key)
    } else {
      out[key] = v
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[stripe-env] Missing or placeholder values for required env vars: ${missing.join(', ')}. ` +
        `Set these in apps/web/.env.local. See .env.example for reference.`
    )
  }

  return out
}

export const STRIPE_ENV = readEnv()

export const STRIPE_PRICES = {
  trial: STRIPE_ENV.STRIPE_PRICE_TRIAL,
  monthly: STRIPE_ENV.STRIPE_PRICE_MONTHLY,
  yearly: STRIPE_ENV.STRIPE_PRICE_YEARLY,
} as const

export const STRIPE_API_VERSION = '2025-01-27.acacia' as const
