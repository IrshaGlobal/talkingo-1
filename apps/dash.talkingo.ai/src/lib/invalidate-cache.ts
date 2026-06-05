/**
 * Notifies the web app to clear its server-side cache after an admin save.
 * Fire-and-forget — never throws, never blocks the admin save response.
 * 
 * Note: Scenarios are now hardcoded, so this is primarily for future use.
 */
export async function invalidateWebCache(
  type: 'all'
): Promise<void> {
  const webUrl = process.env.WEB_APP_URL ?? 'http://localhost:3000'
  const secret = process.env.CACHE_INVALIDATION_SECRET

  try {
    await fetch(`${webUrl}/api/cache/invalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-invalidation-secret': secret } : {}),
      },
      body: JSON.stringify({ type }),
      // Short timeout — don't hold up the admin response
      signal: AbortSignal.timeout(3000),
    })
  } catch (e) {
    // Non-fatal — web app cache will expire on its own TTL
    console.warn(`[admin] Cache invalidation ping failed (${type}):`, e)
  }
}
