import { NextRequest, NextResponse } from 'next/server'
import { getSeedPerformance } from '@/lib/appwrite-admin'
import { adminCache, ADMIN_CACHE, ADMIN_TTL } from '@/lib/admin-cache'
import { verifyAdminAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = adminCache.get<any>(ADMIN_CACHE.SEEDS)
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const seedPerf = await getSeedPerformance()
    seedPerf.sort((a, b) => b.totalSessions - a.totalSessions)

    const result = { seeds: seedPerf }
    adminCache.set(ADMIN_CACHE.SEEDS, result, ADMIN_TTL.SEEDS)

    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } })
  } catch (error: any) {
    console.error('[Admin API] seeds error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to load seed analytics' }, { status: 500 })
  }
}
