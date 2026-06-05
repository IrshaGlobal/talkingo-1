import { NextRequest, NextResponse } from 'next/server'
import {
  listAllUsers,
  getAllUserPreferences,
  getSessionsLastNDays,
} from '@/lib/appwrite-admin'
import { adminCache, ADMIN_CACHE, ADMIN_TTL } from '@/lib/admin-cache'
import { verifyAdminAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '100')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    // ── Cache hit (only for default params) ─────────────────────────────────
    const isDefaultParams = limit === 100 && offset === 0
    if (isDefaultParams) {
      const cached = adminCache.get<any>(ADMIN_CACHE.USERS)
      if (cached) {
        return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } })
      }
    }

    const [authUsers, allPrefs, recentSessions] = await Promise.all([
      listAllUsers(limit, offset),
      getAllUserPreferences(500),
      getSessionsLastNDays(7),
    ])

    const prefsMap = new Map(allPrefs.map((p) => [p.userId, p]))
    const sessionCountMap = new Map<string, number>()
    for (const s of recentSessions) {
      sessionCountMap.set(s.userId, (sessionCountMap.get(s.userId) ?? 0) + 1)
    }

    const enriched = authUsers.map((u) => {
      const prefs = prefsMap.get(u.$id)
      return {
        id: u.$id,
        email: u.email,
        name: u.name || prefs?.userName || 'Unknown',
        status: u.status,
        emailVerification: u.emailVerification,
        labels: u.labels,
        createdAt: u.$createdAt,
        talkLevel: prefs?.talkingoLevel ?? null,
        targetLanguage: prefs?.targetLanguage ?? null,
        learningGoal: prefs?.learningGoal ?? null,
        onboardingComplete: prefs?.onboardingComplete ?? false,
        sessionsLast7d: sessionCountMap.get(u.$id) ?? 0,
      }
    })

    const result = { users: enriched, total: authUsers.length }

    if (isDefaultParams) {
      adminCache.set(ADMIN_CACHE.USERS, result, ADMIN_TTL.USERS)
    }

    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } })
  } catch (error: any) {
    console.error('[Admin API] users list error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to load users' }, { status: 500 })
  }
}
