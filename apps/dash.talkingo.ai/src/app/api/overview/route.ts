import { NextRequest, NextResponse } from 'next/server'
import {
  getTotalUserCount,
  getTotalSessionCount,
  getSessionsInRange,
  getAllUserPreferences,
  getEfficiencyMetrics,
} from '@/lib/appwrite-admin'
import { adminCache, ADMIN_CACHE, ADMIN_TTL } from '@/lib/admin-cache'
import { verifyAdminAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = adminCache.get(ADMIN_CACHE.OVERVIEW)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=0' },
    })
  }

  try {
    const now = Date.now()
    const from30d = now - 30 * 24 * 60 * 60 * 1000
    const from7d = now - 7 * 24 * 60 * 60 * 1000

    // One 30-day fetch covers both 7-day and 30-day windows — no duplicate read
    const [totalUsers, totalSessions, sessions30d, allPrefs, efficiency] = await Promise.all([
      getTotalUserCount(),
      getTotalSessionCount(),
      getSessionsInRange(from30d, now),   // single fetch, split in memory below
      getAllUserPreferences(500),
      getEfficiencyMetrics(),
    ])

    // Split 30d into 7d in memory — zero extra DB reads
    const sessions7d = sessions30d.filter((s) => s.timestamp >= from7d)

    // Active users = unique userIds in last 7 days
    const activeUserIds = new Set(sessions7d.map((s) => s.userId))
    const activeUsers = activeUserIds.size

    // Avg session duration (last 30d)
    const avgDuration =
      sessions30d.length > 0
        ? Math.round(sessions30d.reduce((acc, s) => acc + s.durationSeconds, 0) / sessions30d.length)
        : 0

    // Level distribution
    const levelDist: Record<number, number> = {}
    for (let i = 1; i <= 12; i++) levelDist[i] = 0
    for (const pref of allPrefs) {
      if (pref.talkingoLevel && levelDist[pref.talkingoLevel] !== undefined) levelDist[pref.talkingoLevel]++
    }

    // Language distribution
    const langDist: Record<string, number> = {}
    for (const pref of allPrefs) {
      if (pref.targetLanguage) {
        langDist[pref.targetLanguage] = (langDist[pref.targetLanguage] ?? 0) + 1
      }
    }

    // Sessions per day (last 7 days) — computed from already-fetched data
    const sessionsPerDay: Array<{ date: string; count: number; avgDuration: number }> = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date()
      dayStart.setHours(0, 0, 0, 0)
      dayStart.setDate(dayStart.getDate() - i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const daySessions = sessions7d.filter(
        (s) => s.timestamp >= dayStart.getTime() && s.timestamp < dayEnd.getTime()
      )
      const dayAvgDuration =
        daySessions.length > 0
          ? Math.round(daySessions.reduce((acc, s) => acc + s.durationSeconds, 0) / daySessions.length)
          : 0

      sessionsPerDay.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: daySessions.length,
        avgDuration: dayAvgDuration,
      })
    }

    const abandonedCount = sessions30d.filter((s) => s.abandoned).length
    const completedCount = sessions30d.filter((s) => s.unitComplete).length
    const abandonmentRate =
      sessions30d.length > 0 ? Math.round((abandonedCount / sessions30d.length) * 100) : 0
    const completionRate =
      sessions30d.length > 0 ? Math.round((completedCount / sessions30d.length) * 100) : 0

    const result = {
      totalUsers,
      totalSessions,
      activeUsers,
      sessions7d: sessions7d.length,
      sessions30d: sessions30d.length,
      avgDuration,
      abandonmentRate,
      completionRate,
      levelDistribution: levelDist,
      languageDistribution: langDist,
      sessionsPerDay,
      efficiency, // New: Real-time cost and storage savings
    }

    adminCache.set(ADMIN_CACHE.OVERVIEW, result, ADMIN_TTL.OVERVIEW)

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=0' },
    })
  } catch (error: any) {
    console.error('[Admin API] overview error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to load overview' }, { status: 500 })
  }
}
