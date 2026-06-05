import { account } from '@/lib/auth-client'

let cachedJwt: { jwt: string; fetchedAt: number } | null = null

async function getJwt(): Promise<string> {
  if (cachedJwt && Date.now() - cachedJwt.fetchedAt < 30_000) return cachedJwt.jwt
  const res = await (account as any).createJWT()
  const jwt = res?.jwt as string | undefined
  if (!jwt) throw new Error('Could not create Appwrite JWT')
  cachedJwt = { jwt, fetchedAt: Date.now() }
  return jwt
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const jwt = await getJwt()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${jwt}`)
  return fetch(input, { ...init, headers })
}
