'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '../ui/LoadingScreen'

/**
 * Wraps protected pages. Redirects to /login if not authenticated.
 * Shows a loading screen while the session is being checked.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!loading && !user) {
      const qs = searchParams.toString()
      const current = qs ? `${pathname}?${qs}` : pathname
      router.replace(`/login?redirect=${encodeURIComponent(current)}`)
    }
  }, [user, loading, pathname, router, searchParams])

  // Still checking session
  if (loading) {
    return <LoadingScreen />
  }

  // Not logged in — render nothing while redirect happens
  if (!user) return <LoadingScreen />

  return <>{children}</>
}
