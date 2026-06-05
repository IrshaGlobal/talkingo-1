import { NextRequest, NextResponse } from 'next/server'
import { createNotification, getAllNotifications, deleteNotification } from '@/lib/appwrite-admin'
import { adminCache, ADMIN_CACHE, ADMIN_TTL } from '@/lib/admin-cache'
import { verifyAdminAuth } from '@/lib/api-auth'

// GET /api/notifications — list all notifications (admin view)
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!
  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = adminCache.get<any>(ADMIN_CACHE.NOTIFICATIONS)
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const notifications = await getAllNotifications(100)
    const result = { notifications }
    adminCache.set(ADMIN_CACHE.NOTIFICATIONS, result, ADMIN_TTL.NOTIFICATIONS)
    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } })
  } catch (error: any) {
    console.error('[Admin API] notifications list error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to load notifications' }, { status: 500 })
  }
}

// POST /api/notifications — create a new notification
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  try {
    const body = await req.json()
    const { userId, type, title, message, targetAll, createdBy } = body

    if (!title || !message || !type) {
      return NextResponse.json({ error: 'title, message, and type are required' }, { status: 400 })
    }

    const notification = await createNotification({
      userId: targetAll ? 'all' : (userId ?? 'all'),
      type: type ?? 'announcement',
      title,
      message,
      read: false,
      createdAt: Date.now(),
      createdBy: createdBy ?? 'admin',
      targetAll: targetAll ?? true,
    })

    // Invalidate cache so next GET returns fresh data
    adminCache.invalidate(ADMIN_CACHE.NOTIFICATIONS)

    return NextResponse.json({ notification })
  } catch (error: any) {
    console.error('[Admin API] notification create error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create notification' }, { status: 500 })
  }
}

// DELETE /api/notifications?id=xxx
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await deleteNotification(id)

    // Invalidate cache
    adminCache.invalidate(ADMIN_CACHE.NOTIFICATIONS)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Admin API] notification delete error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to delete notification' }, { status: 500 })
  }
}
