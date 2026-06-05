'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { account } from '@/lib/auth-client'
import { Loader2, LogIn } from 'lucide-react'
import { TalkingoLogo } from '@/components/TalkingoLogo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/overview'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await account.createEmailPasswordSession(email, password)
      router.replace(redirectTo)
    } catch (err: any) {
      const msg = err?.message || 'Sign in failed'
      if (msg.includes('Invalid credentials')) {
        setError('Incorrect email or password.')
      } else if (msg.includes('rate')) {
        setError('Too many attempts. Please wait a moment.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/[0.06] blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <TalkingoLogo size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold text-text-primary">Talkingo Admin</h1>
          <p className="text-sm text-text-tertiary mt-2">
            Sign in with your Appwrite admin account
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/15 to-accent/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg pointer-events-none" />
          <div className="relative rounded-2xl bg-surface-2/90 backdrop-blur-xl border border-border-subtle p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@talkingo.ai"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-3/50 border border-border-medium text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-3/50 border border-border-medium text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-primary-dim text-background shadow-glow-sm hover:shadow-glow-primary hover:brightness-110 active:brightness-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
          <TalkingoLogo size="lg" />
          <div className="w-9 h-9 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
