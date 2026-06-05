'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard] Error boundary caught:', error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="relative group max-w-md w-full">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-error/15 to-transparent blur-lg pointer-events-none" />
        <div className="relative rounded-2xl bg-surface-2/90 backdrop-blur-xl border border-error/20 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-error/10 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Something went wrong</h2>
          <p className="text-sm text-text-tertiary mb-6">
            An unexpected error occurred while loading this page.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-primary-dim text-background shadow-glow-sm hover:shadow-glow-primary hover:brightness-110 transition-all duration-200"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
