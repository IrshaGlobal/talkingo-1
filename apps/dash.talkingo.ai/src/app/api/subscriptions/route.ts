import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { verifyAdminAuth } from '@/lib/api-auth'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2025-04-30.basil' as any })
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    const { subscriptionId } = await req.json()
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 })
    }

    const canceled = await stripe.subscriptions.cancel(subscriptionId)
    return NextResponse.json({ success: true, status: canceled.status })
  } catch (err: any) {
    console.error('[admin/subscriptions] Cancel error:', err.message)
    return NextResponse.json({ error: err.message || 'Failed to cancel subscription' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ subscriptions: [], stats: { active: 0, trialing: 0, canceled: 0, mrr: 0 } })
  }

  try {
    const [active, trialing, canceled] = await Promise.all([
      stripe.subscriptions.list({ status: 'active', limit: 100 }),
      stripe.subscriptions.list({ status: 'trialing', limit: 100 }),
      stripe.subscriptions.list({ status: 'canceled', limit: 10 }),
    ])

    const allSubs = [...active.data, ...trialing.data, ...canceled.data]

    const mrr = active.data.reduce((sum, sub) => {
      const item = sub.items.data[0]
      if (!item?.price) return sum
      const amount = item.price.unit_amount || 0
      if (item.price.recurring?.interval === 'year') return sum + Math.round(amount / 12)
      return sum + amount
    }, 0)

    const subscriptions = await Promise.all(
      allSubs.slice(0, 50).map(async (sub) => {
        let email: string | undefined
        try {
          if (sub.customer && typeof sub.customer === 'string') {
            const customer = await stripe.customers.retrieve(sub.customer)
            if (!('deleted' in customer)) email = customer.email || undefined
          }
        } catch { /* ignore */ }

        return {
          id: sub.id,
          customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
          status: sub.status,
          plan: sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
          amount: sub.items.data[0]?.price?.unit_amount || 0,
          currentPeriodEnd: new Date(((sub as any).current_period_end || 0) * 1000).toISOString(),
          trialEnd: sub.trial_end ? new Date((sub.trial_end as number) * 1000).toISOString() : undefined,
          email,
        }
      })
    )

    return NextResponse.json({
      subscriptions,
      stats: {
        active: active.data.length,
        trialing: trialing.data.length,
        canceled: canceled.data.length,
        mrr,
      },
    })
  } catch (err: any) {
    console.error('[admin/subscriptions] Error:', err.message)
    return NextResponse.json({ subscriptions: [], stats: { active: 0, trialing: 0, canceled: 0, mrr: 0 } })
  }
}
