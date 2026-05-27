'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '../ui/LoadingScreen'

/**
 * Wraps protected pages. Redirects to /login if not authenticated.
 * Shows a loading screen while the session is being checked.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // Still checking session
  if (loading) {
    return <LoadingScreen />
  }

  // Not logged in — render nothing while redirect happens
  if (!user) return null

  return <>{children}</>
}
