import { NextRequest, NextResponse } from 'next/server'
import {
  getUserById,
  getUserPreferences,
  getUserProgress,
  getSessionsByUser,
  updateUserLabels,
  blockUser,
  unblockUser,
  deleteUser,
} from '@/lib/appwrite-admin'
import { verifyAdminAuth } from '@/lib/api-auth'

// GET /api/users/[userId] — full user detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  try {
    const { userId } = await params
    const [authUser, prefs, progress, sessions] = await Promise.all([
      getUserById(userId),
      getUserPreferences(userId),
      getUserProgress(userId),
      getSessionsByUser(userId),
    ])

    return NextResponse.json({
      user: {
        id: authUser.$id,
        email: authUser.email,
        name: authUser.name,
        status: authUser.status,
        emailVerification: authUser.emailVerification,
        labels: authUser.labels,
        createdAt: authUser.$createdAt,
      },
      preferences: prefs,
      progress,
      sessions: sessions.slice(0, 50),
      sessionCount: sessions.length,
    })
  } catch (error: any) {
    console.error('[Admin API] user detail error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to load user' }, { status: 500 })
  }
}

// PATCH /api/users/[userId] — update user (block/unblock/labels)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  try {
    const { userId } = await params
    const body = await req.json()

    if (body.action === 'block') {
      await blockUser(userId)
      return NextResponse.json({ success: true, action: 'blocked' })
    }

    if (body.action === 'unblock') {
      await unblockUser(userId)
      return NextResponse.json({ success: true, action: 'unblocked' })
    }

    if (body.action === 'updateLabels' && Array.isArray(body.labels)) {
      await updateUserLabels(userId, body.labels)
      return NextResponse.json({ success: true, action: 'labelsUpdated' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Admin API] user update error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/users/[userId] — permanently delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await verifyAdminAuth(req)
  if (!auth.authorized) return auth.error!

  try {
    const { userId } = await params
    await deleteUser(userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Admin API] user delete error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to delete user' }, { status: 500 })
  }
}
