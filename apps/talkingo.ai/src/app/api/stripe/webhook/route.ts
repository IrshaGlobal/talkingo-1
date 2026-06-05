import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { STRIPE_ENV } from '@/lib/stripe/env'
import {
  upsertSubscription,
  updateUserPrefs,
  claimWebhookEvent,
  getSubscriptionByCustomerId,
  logSubscriptionEvent,
  logDeadLetterEvent,
  createNotification,
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
 * failures, portal-driven cancellations, chargebacks, etc.).
 *
 * Idempotency: every event is claimed via `claimWebhookEvent(event.id)`.
 * Duplicate retries are skipped silently.
 *
 * Events handled:
 *   - checkout.session.completed        → first-sync from Stripe
 *   - customer.subscription.created     → re-subscribes via portal
 *   - customer.subscription.updated     → status, plan-change, cancel_at_period_end
 *   - customer.subscription.deleted     → mark expired
 *   - customer.subscription.paused      → mark paused
 *   - customer.subscription.resumed     → resume from paused
 *   - customer.subscription.trial_will_end → retention email opportunity
 *   - invoice.paid                      → confirm payment (redundant with payment_succeeded)
 *   - invoice.payment_succeeded         → confirm trialing → active transition
 *   - invoice.payment_failed            → mark past_due
 *   - invoice.payment_action_required   → 3DS/SCA needed — mark past_due + alert
 *   - charge.dispute.created            → immediately expire subscription
 *   - charge.dispute.closed             → restore or permanently ban
 *   - charge.refunded                   → mark subscription canceled/expired
 *   - customer.updated                  → sync customer metadata
 *   - payment_method.attached/detached  → audit payment method changes
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
  // Safety guard: prevent processing production Stripe events against
  // a development/test database. Set STRIPE_ALLOW_TEST_WEBHOOKS=true in
  // dev to enable (or rely on webhook secret isolation).
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.STRIPE_ALLOW_TEST_WEBHOOKS !== 'true'
  ) {
    return NextResponse.json({ received: true, skipped: true })
  }

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

      case 'invoice.paid':
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
          console.log(`[webhook] ${event.type} → ${userId}: ${sub.status}`)
        } catch (err: any) {
          // If the subscription was deleted between invoice creation and webhook
          // delivery, mark it expired so the user's state doesn't stay stale.
          if (err?.code === 'resource_missing') {
            const userId = await resolveUserId(undefined, customerId)
            if (userId) {
              await upsertSubscription(userId, {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: 'expired',
                plan: 'monthly',
                cancelAtPeriodEnd: false,
                updatedAt: Date.now(),
              })
              await updateUserPrefs(userId, {
                subscriptionStatus: 'expired',
                subscriptionUpdatedAt: Date.now(),
              })
              console.log(`[webhook] ${event.type} → ${userId}: subscription deleted, marked expired`)
            }
          } else {
            console.error('[webhook] payment_succeeded handler error:', err)
          }
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
          // Notify the user about the payment failure
          createNotification({
            userId,
            type: 'warning',
            title: 'Payment Failed',
            message: 'Your last payment didn\'t go through. Update your payment method to keep your subscription active.',
            link: '/profile',
          }).catch(() => {})
          console.log(`[webhook] invoice.payment_failed → ${userId}: past_due`)
        } catch (err: any) {
          if (err?.code === 'resource_missing') {
            const userId = await resolveUserId(undefined, customerId)
            if (userId) {
              await upsertSubscription(userId, {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                status: 'expired',
                plan: 'monthly',
                cancelAtPeriodEnd: false,
                updatedAt: Date.now(),
              })
              await updateUserPrefs(userId, {
                subscriptionStatus: 'expired',
                subscriptionUpdatedAt: Date.now(),
              })
              console.log(`[webhook] invoice.payment_failed → ${userId}: subscription deleted, marked expired`)
            }
          } else {
            console.error('[webhook] payment_failed handler error:', err)
          }
        }
        break
      }

      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const userId = await resolveUserId(sub.metadata?.userId, customerId)
        if (!userId) break
        await syncSubscriptionToAppwrite({ userId, customerId, subscription: sub })
        console.log(`[webhook] ${event.type} → ${userId}: ${sub.status}`)
        break
      }

      case 'invoice.payment_action_required': {
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
          // Notify the user about 3DS / SCA action required
          createNotification({
            userId,
            type: 'warning',
            title: 'Payment Action Required',
            message: 'Your bank needs extra verification. Update your payment method to keep your subscription active.',
            link: '/profile',
          }).catch(() => {})
          console.log(`[webhook] invoice.payment_action_required → ${userId}: 3DS/SCA needed`)
        } catch (err) {
          console.error('[webhook] payment_action_required handler error:', err)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id
        if (!customerId) break
        try {
          const subDoc = await getSubscriptionByCustomerId(customerId)
          if (!subDoc) break
          await upsertSubscription(subDoc.userId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subDoc.stripeSubscriptionId,
            status: 'past_due',
            plan: subDoc.plan as 'monthly' | 'yearly',
            cancelAtPeriodEnd: false,
            updatedAt: Date.now(),
          })
          await updateUserPrefs(subDoc.userId, {
            subscriptionStatus: 'past_due',
            subscriptionUpdatedAt: Date.now(),
          })
          createNotification({
            userId: subDoc.userId,
            type: 'warning',
            title: 'SCA / 3DS Payment Failed',
            message: 'Your bank declined the strong customer authentication. Try a different card or contact your bank.',
            link: '/profile',
          }).catch(() => {})
          console.log(`[webhook] payment_intent.payment_failed → ${subDoc.userId}: SCA/3DS failed`)
        } catch (err) {
          console.error('[webhook] payment_intent.payment_failed handler error:', err)
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
        if (!chargeId) break
        try {
          const charge = await stripe.charges.retrieve(chargeId)
          const customerId = typeof charge.customer === 'string' ? charge.customer : undefined
          if (!customerId) break
          const subDoc = await getSubscriptionByCustomerId(customerId)
          if (!subDoc) break
          await upsertSubscription(subDoc.userId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subDoc.stripeSubscriptionId,
            status: 'expired',
            plan: subDoc.plan as 'monthly' | 'yearly',
            cancelAtPeriodEnd: false,
            updatedAt: Date.now(),
          })
          await updateUserPrefs(subDoc.userId, {
            subscriptionStatus: 'expired',
            subscriptionUpdatedAt: Date.now(),
          })
          console.error(`[webhook] 🚨 DISPUTE CREATED for user ${subDoc.userId} — access revoked`)
        } catch (err) {
          console.error('[webhook] dispute.created handler error:', err)
        }
        break
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
        if (!chargeId) break
        try {
          const charge = await stripe.charges.retrieve(chargeId)
          const customerId = typeof charge.customer === 'string' ? charge.customer : undefined
          if (!customerId) break
          const subDoc = await getSubscriptionByCustomerId(customerId)
          if (!subDoc) break
          if (dispute.status === 'won') {
            const sub = await stripe.subscriptions.retrieve(subDoc.stripeSubscriptionId!)
            await syncSubscriptionToAppwrite({ userId: subDoc.userId, customerId, subscription: sub })
            console.log(`[webhook] dispute won → ${subDoc.userId}: access restored`)
          } else {
            console.log(`[webhook] dispute lost → ${subDoc.userId}: access permanently revoked`)
          }
        } catch (err) {
          console.error('[webhook] dispute.closed handler error:', err)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const customerId = typeof charge.customer === 'string' ? charge.customer : undefined
        if (!customerId) break
        try {
          const subDoc = await getSubscriptionByCustomerId(customerId)
          if (!subDoc) break
          if (charge.refunded) {
            await upsertSubscription(subDoc.userId, {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subDoc.stripeSubscriptionId,
              status: 'canceled',
              plan: subDoc.plan as 'monthly' | 'yearly',
              cancelAtPeriodEnd: false,
              updatedAt: Date.now(),
            })
            await updateUserPrefs(subDoc.userId, {
              subscriptionStatus: 'canceled',
              subscriptionUpdatedAt: Date.now(),
            })
            console.log(`[webhook] charge.refunded → ${subDoc.userId}: subscription canceled`)
          }
        } catch (err) {
          console.error('[webhook] charge.refunded handler error:', err)
        }
        break
      }

      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer
        if (!customer.metadata?.userId) break
        console.log(`[webhook] customer.updated → ${customer.metadata.userId}`)
        break
      }

      case 'payment_method.attached':
      case 'payment_method.detached': {
        const pm = event.data.object as Stripe.PaymentMethod
        const customerId = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id
        if (!customerId) break
        const subDoc = await getSubscriptionByCustomerId(customerId)
        if (!subDoc) break
        console.log(`[webhook] ${event.type} → ${subDoc.userId}: payment method ${pm.id}`)
        break
      }

      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const userId = await resolveUserId(sub.metadata?.userId, customerId)
        if (!userId) break
        // Retention opportunity: user's trial ends in ~3 days.
        // Wire this to your email service (Resend, Postmark, etc.) to send
        // a "Your trial is ending" reminder with a CTA to keep Premium.
        console.log(`[webhook] trial_will_end → ${userId}: retention email opportunity`)
        break
      }

      default:
        break
    }
  } catch (err) {
    // Don't let Stripe retry blindly — capture to dead letter queue instead.
    // Stripe's retry mechanism is unreliable for extended outages; we control
    // recovery via the dead letter dashboard + reconciliation cron.
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Handler error:', errMsg)
    logDeadLetterEvent(event.id, event.type, errMsg, body).catch(() => {})
    return NextResponse.json({ received: true, dead_letter: true })
  }

  return NextResponse.json({ received: true })
}
