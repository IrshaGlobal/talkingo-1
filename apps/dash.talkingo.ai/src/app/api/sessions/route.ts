import { NextRequest, NextResponse } from 'next/server'
import { getRecentSessions, getSessionsLastNDays } from '@/lib/appwrite-admin'
import { adminCache, ADMIN_CACHE, ADMIN_TTL } from '@/lib/admin-cache'
import { verifyAdminAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '100')

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cacheKey = ADMIN_CACHE.SESSIONS(days)
    const cached = adminCache.get<any>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } })
    }

    const sessions = days === 0
      ? await getRecentSessions(limit)
      : await getSessionsLastNDays(days)

    const totalDuration = sessions.reduce((acc, s) => acc + s.durationSeconds, 0)
    const totalCorrections = sessions.reduce((acc, s) => acc + s.correctionCount, 0)
    const abandonedCount = sessions.filter((s) => s.abandoned).length
    const completedCount = sessions.filter((s) => s.unitComplete).length

    const result = {
      sessions,
      stats: {
        total: sessions.length,
        avgDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
        avgCorrections: sessions.length > 0 ? parseFloat((totalCorrections / sessions.length).toFixed(1)) : 0,
        abandonmentRate: sessions.length > 0 ? Math.round((abandonedCount / sessions.length) * 100) : 0,
        completionRate: sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0,
      },
    }

    adminCache.set(cacheKey, result, ADMIN_TTL.SESSIONS)

    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } })
  } catch (error: any) {
    console.error('[Admin API] sessions error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to load sessions' }, { status: 500 })
  }
}
