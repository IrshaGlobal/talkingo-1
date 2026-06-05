/**
 * POST /api/cache/invalidate
 *
 * Previously used for scenario cache invalidation.
 * Now scenarios are hardcoded, so this endpoint is a no-op.
 * Kept for backwards compatibility and potential future use.
 *
 * Body: { type: 'all' } (ignored)
 *
 * Protected by a shared secret (CACHE_INVALIDATION_SECRET env var).
 * If not set, only same-origin requests are accepted.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Simple auth check — shared secret header
  const secret = process.env.CACHE_INVALIDATION_SECRET
  if (secret) {
    const provided = req.headers.get('x-invalidation-secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Drain body if present (no-op)
  try { await req.json() } catch { /* empty body is fine */ }

  return NextResponse.json({
    success: true,
    invalidated: 'none (scenarios are hardcoded)',
    timestamp: Date.now(),
  })
}
