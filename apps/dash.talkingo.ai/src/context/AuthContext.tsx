'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { account } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

interface AuthUser {
  id: string
  email: string
  name: string
  labels: string[]
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  authError: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  authError: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    try {
      const userData = await account.get()

      const verifyRes = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.$id }),
      })

      if (verifyRes.status === 401) {
        await account.deleteSession('current').catch(() => {})
        setUser(null)
        setAuthError('Your session has expired. Please sign in again.')
        router.replace('/login')
        return
      }

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}))
        if (verifyRes.status === 403) {
          await account.deleteSession('current').catch(() => {})
          setUser(null)
          setAuthError('This account does not have admin access. Please use an admin account.')
          router.replace('/login')
          return
        }
        setAuthError(data.reason || 'Could not verify admin access. Check your server configuration.')
        setLoading(false)
        return
      }

      const verifyData = await verifyRes.json()

      if (!verifyData.isAdmin) {
        await account.deleteSession('current').catch(() => {})
        setUser(null)
        setAuthError('This account does not have admin access.')
        router.replace('/login')
        return
      }

      setUser({
        id: userData.$id,
        email: userData.email,
        name: userData.name,
        labels: verifyData.user?.labels ?? [],
      })
      setAuthError(null)
    } catch (err: any) {
      console.error('[AuthContext] Auth error:', err?.message || err)
      setUser(null)
      const errorMsg = err?.message || 'Could not connect to authentication server.'
      setAuthError(`Connection Error: ${errorMsg}. Check console for details.`)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const signOut = async () => {
    try {
      await account.deleteSession('current')
    } catch {
      // ignore
    } finally {
      setUser(null)
      router.replace('/login')
    }
  }

  const isAdmin = user?.labels?.includes('admin') ?? false

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
