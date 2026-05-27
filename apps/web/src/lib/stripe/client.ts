/**
 * Shared Stripe SDK instance with pinned API version.
 *
 * Pinning the API version protects us from silent breaking changes when
 * Stripe rolls out new API versions. Bump this intentionally after testing.
 */

import Stripe from 'stripe'
import { STRIPE_ENV, STRIPE_API_VERSION } from './env'

export const stripe = new Stripe(STRIPE_ENV.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
  typescript: true,
})
