import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { getUserDatabases } from '@/lib/appwrite-server'
import { APPWRITE_DB_ID, COLLECTION_IDS } from '@/lib/appwrite-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTIFICATIONS_COLLECTION = COLLECTION_IDS.NOTIFICATIONS

// GET /api/notifications — fetch notifications for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // ── Auth: verify user has a valid session ────────────────────────────
    const { verifyAuth } = await import('@/lib/api/auth-guard')
    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, jwt } = auth

    // Read as the user — respects per-doc permissions on the notifications
    // collection (read("users") + the user's own notifications).
    const databases = getUserDatabases(jwt)

    const res = await databases.listDocuments(APPWRITE_DB_ID, NOTIFICATIONS_COLLECTION, [
      Query.or([
        Query.equal('userId', userId),
        Query.equal('targetAll', true),
      ]),
      Query.orderDesc('createdAt'),
      Query.limit(50),
    ])

    return NextResponse.json({ notifications: res.documents })
  } catch (error: any) {
    // If collection doesn't exist yet, return empty
    if (error?.code === 404) {
      return NextResponse.json({ notifications: [] })
    }
    console.error('[Web API] notifications error:', error)
    return NextResponse.json({ notifications: [] })
  }
}

// PATCH /api/notifications — mark notification as read
export async function PATCH(req: NextRequest) {
  try {
    // ── Auth: verify user has a valid session ────────────────────────────
    const { verifyAuth } = await import('@/lib/api/auth-guard')
    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId } = auth

    const body = await req.json()
    const { notificationId } = body

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId is required' }, { status: 400 })
    }

    // Use admin client for the write so this works regardless of how the
    // admin app set per-doc permissions. We enforce ownership manually:
    // the user can only mark notifications they own (userId match) or
    // broadcast notifications (targetAll === true).
    const { getAdminDatabases } = await import('@/lib/appwrite-server')
    const adminDb = getAdminDatabases()

    let doc: any
    try {
      doc = await adminDb.getDocument(APPWRITE_DB_ID, NOTIFICATIONS_COLLECTION, notificationId)
    } catch (err: any) {
      if (err?.code === 404) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      throw err
    }

    const owns = doc.userId === userId
    const isBroadcast = doc.targetAll === true
    if (!owns && !isBroadcast) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await adminDb.updateDocument(APPWRITE_DB_ID, NOTIFICATIONS_COLLECTION, notificationId, {
      read: true,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Web API] mark notification read error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to update notification' },
      { status: 500 }
    )
  }
}
