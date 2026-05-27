import 'server-only'

/**
 * Server-side auth guard for API routes.
 *
 * Verifies the user's Appwrite session using a JWT (JSON Web Token).
 * The client creates a JWT via account.createJWT() and sends it in the
 * X-Appwrite-JWT header. This is the official Appwrite pattern for
 * server-side auth and works reliably across all environments.
 *
 * Usage in API routes:
 *   const auth = await verifyAuth(req)
 *   if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   // auth.userId  → the verified user id
 *   // auth.jwt     → the JWT (for downstream user-context Appwrite calls)
 *
 *   // Backwards-compatible: if you only need the userId
 *   const userId = await verifyAuthUserId(req)
 */

import { NextRequest } from 'next/server'
import { Client, Account } from 'node-appwrite'

export interface AuthContext {
  userId: string
  jwt: string
}

/**
 * Verify the user's Appwrite session via JWT.
 * Returns { userId, jwt } if valid, null otherwise.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthContext | null> {
  try {
    const jwt =
      req.headers.get('x-appwrite-jwt') ||
      // Backwards-compat: some older clients may still send X-Appwrite-Session
      req.headers.get('x-appwrite-session')

    if (!jwt) return null

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setJWT(jwt)

    const account = new Account(client)
    const user = await account.get()
    return { userId: user.$id, jwt }
  } catch {
    return null
  }
}

/**
 * Convenience: verify auth and return only the userId.
 * Used by callers that don't need to make further Appwrite calls.
 */
export async function verifyAuthUserId(req: NextRequest): Promise<string | null> {
  const auth = await verifyAuth(req)
  return auth?.userId ?? null
}

/**
 * Simple rate limiter using in-memory store.
 * Resets every window (default 60s). Not distributed — works per-instance only.
 *
 * NOTE: In serverless environments (Vercel), this provides best-effort
 * per-instance limiting. For true distributed rate limiting, use Redis.
 * Still useful as a safety net against burst abuse within a single instance.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  pruneExpiredEntries()
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}

function pruneExpiredEntries() {
  if (rateLimitStore.size < 100) return
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key)
  }
}
