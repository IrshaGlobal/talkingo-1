import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { STRIPE_ENV } from '@/lib/stripe/env'
import {
  upsertSubscription,
  updateUserPrefs,
  claimWebhookEvent,
  getSubscriptionByCustomerId,
} from '@/lib/appwrite-server'
import { syncSubscriptionToAppwrite, detectPlanFromSubscription } from '@/lib/stripe/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe Webhook handler.
 *
 * Real-time backup channel. The user's first sight of Premium happens via
 * the post-checkout sync endpoint (no waiting for Stripe-to-us roundtrip).
 * This webhook keeps state correct for ongoing events (renewals, payment
 * failures, portal-driven cancellations, etc.).
 *
 * Idempotency: every event is claimed via `claimWebhookEvent(event.id)`.
 * Duplicate retries are skipped silently.
 *
 * Events handled:
 *   - checkout.session.completed   → first-sync from Stripe
 *   - customer.subscription.created → re-subscribes via portal
 *   - customer.subscription.updated → status, plan-change, cancel_at_period_end
 *   - customer.subscription.deleted → mark expired
 *   - invoice.payment_succeeded    → confirm trialing → active transition
 *   - invoice.payment_failed       → mark past_due
 */

async function resolveUserId(
  metadataUserId: string | undefined,
  customerId: string | null | undefined
): Promise<string | null> {
  if (metadataUserId) return metadataUserId
  if (!customerId) return null
  const existing = await getSubscriptionByCustomerId(customerId)
  return existing?.userId ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_ENV.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const claimed = await claimWebhookEvent(event.id, event.type)
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? undefined
        const userId = await resolveUserId(session.metadata?.userId, customerId)

        if (!userId || !customerId || !subscriptionId) {
          console.warn('[webhook] checkout.session.completed missing context')
          break
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await syncSubscriptionToAppwrite({ userId, customerId, subscription })
        console.log(`[webhook] checkout.session.completed → ${userId}: ${subscription.status}`)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const userId = await resolveUserId(sub.metadata?.userId, customerId)

        if (!userId) {
          console.warn(`[webhook] ${event.type} — could not resolve userId for customer ${customerId}`)
          break
        }

        await syncSubscriptionToAppwrite({ userId, customerId, subscription: sub })
        console.log(`[webhook] ${event.type} → ${userId}: ${sub.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const userId = await resolveUserId(sub.metadata?.userId, customerId)
        if (!userId) break

        await upsertSubscription(userId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          status: 'expired',
          plan: detectPlanFromSubscription(sub),
          cancelAtPeriodEnd: false,
          updatedAt: Date.now(),
        })
        await updateUserPrefs(userId, {
          subscriptionStatus: 'expired',
          subscriptionUpdatedAt: Date.now(),
        })
        console.log(`[webhook] subscription.deleted → ${userId}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | undefined
        const customerId = invoice.customer as string
        if (!subscriptionId) break

        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = await resolveUserId(sub.metadata?.userId, customerId)
          if (!userId) break
          await syncSubscriptionToAppwrite({ userId, customerId, subscription: sub })
          console.log(`[webhook] invoice.payment_succeeded → ${userId}: ${sub.status}`)
        } catch (err) {
          console.error('[webhook] payment_succeeded handler error:', err)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | undefined
        const customerId = invoice.customer as string
        if (!subscriptionId) break

        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = await resolveUserId(sub.metadata?.userId, customerId)
          if (!userId) break

          await upsertSubscription(userId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: 'past_due',
            plan: detectPlanFromSubscription(sub),
            cancelAtPeriodEnd: (sub as any).cancel_at_period_end ?? false,
            updatedAt: Date.now(),
          })
          await updateUserPrefs(userId, {
            subscriptionStatus: 'past_due',
            subscriptionUpdatedAt: Date.now(),
          })
          console.log(`[webhook] invoice.payment_failed → ${userId}: past_due`)
        } catch (err) {
          console.error('[webhook] payment_failed handler error:', err)
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
