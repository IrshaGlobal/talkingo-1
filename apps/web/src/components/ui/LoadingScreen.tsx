'use client'

import { TalkingoLogo } from './TalkingoLogo'

/**
 * Unified branded loading screen — Talkingo logo with a Cloudflare-style
 * progress bar that slides left-to-right beneath it.
 */
export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      {/* Logo */}
      <TalkingoLogo size="xl" />

      {/* Cloudflare-style loading bar */}
      <div className="w-48 h-1 bg-muted/50 rounded-full overflow-hidden">
        <div className="h-full w-2/5 bg-gradient-to-r from-primary via-primary-glow to-primary rounded-full animate-loading-bar" />
      </div>
    </div>
  )
}
