/**
 * Server-side in-process cache for the admin dashboard.
 *
 * Admin data changes infrequently (sessions accumulate, users register).
 * Caching for 60 seconds eliminates the "every tab switch = DB read" problem
 * while keeping data fresh enough for an admin dashboard.
 *
 * Each admin page has its own cache key and TTL.
 * Write operations (create/update/delete) invalidate the relevant key.
 */

interface CacheEntry<T> {
  value: T
  fetchedAt: number
  ttlMs: number
}

class AdminCache {
  private store = new Map<string, CacheEntry<any>>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > entry.ttlMs) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, fetchedAt: Date.now(), ttlMs })
  }

  invalidate(...keys: string[]): void {
    for (const key of keys) this.store.delete(key)
  }

  invalidateAll(): void {
    this.store.clear()
  }
}

export const adminCache = new AdminCache()

// ─── Cache keys ───────────────────────────────────────────────────────────────
export const ADMIN_CACHE = {
  OVERVIEW: 'admin:overview',
  SESSIONS: (days: number) => `admin:sessions:${days}`,
  USERS: 'admin:users',
  SEEDS: 'admin:seeds',
  NOTIFICATIONS: 'admin:notifications',
} as const

// ─── TTLs (in ms) ─────────────────────────────────────────────────────────────
export const ADMIN_TTL = {
  OVERVIEW: 60_000,       // 1 min — analytics data, fine to be slightly stale
  SESSIONS: 30_000,       // 30 sec — more real-time feel
  USERS: 60_000,          // 1 min
  SEEDS: 120_000,         // 2 min — seed analytics rarely change
  NOTIFICATIONS: 30_000,  // 30 sec — admins expect near-real-time
} as const
