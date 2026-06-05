import { NextRequest, NextResponse } from 'next/server'
import { syncFromCheckoutSession } from '@/lib/stripe/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/sync-checkout
 *
 * Called by the browser immediately after Stripe redirects back with
 * `?subscription=success&session_id=...`. Pulls the live subscription
 * from Stripe and writes it to Appwrite, so the user sees Premium right
 * away regardless of whether the webhook has fired yet.
 *
 * Body: { sessionId: string }
 *
 * Returns: { status, plan, customerId, trialEnd, periodEnd, cancelAtPeriodEnd }
 */

export async function POST(req: NextRequest) {
  try {
    const { verifyAuth, checkRateLimit, validateOrigin } = await import('@/lib/api/auth-guard')

    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }

    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = checkRateLimit(`stripe:sync:${auth.userId}`, 10, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { sessionId } = body as { sessionId?: string }
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    const result = await syncFromCheckoutSession({ userId: auth.userId, sessionId })
    if (!result) {
      return NextResponse.json({ error: 'Subscription not yet ready' }, { status: 202 })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    const msg = err?.message || 'Failed to sync subscription'
    if (msg.includes('does not belong')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (msg.includes('Invalid subscription price')) {
      return NextResponse.json({ error: 'Invalid subscription price' }, { status: 400 })
    }
    console.error('[stripe/sync-checkout] Error:', msg)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
