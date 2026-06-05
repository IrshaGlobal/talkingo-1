'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AlertTriangle, LogOut } from 'lucide-react'

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, authError, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !authError) {
      router.replace('/login')
    }
  }, [loading, user, authError, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Verifying access…</p>
        </div>
      </div>
    )
  }

  if (!user && !authError) {
    return null
  }

  if (authError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="relative group max-w-md w-full mx-4">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-error/15 to-transparent blur-lg pointer-events-none" />
          <div className="relative rounded-2xl bg-surface-2/90 backdrop-blur-xl border border-error/20 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-error/10 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-error" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Connection Error</h2>
            <p className="text-sm text-text-tertiary mb-6">{authError}</p>
            <p className="text-xs text-text-tertiary mb-6">
              Make sure your <code className="px-1.5 py-0.5 bg-surface-3 rounded text-xs text-text-secondary">.env.local</code> has valid Appwrite and Stripe credentials.
            </p>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-primary-dim text-background shadow-glow-sm hover:shadow-glow-primary hover:brightness-110 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background ambient-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto relative z-10">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardGuard>
        {children}
      </DashboardGuard>
    </AuthProvider>
  )
}
