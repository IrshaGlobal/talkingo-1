'use client'

/**
 * Paywall — shown when a free user needs to convert.
 *
 * Three options:
 *   - 5-Day Trial ($1 today, then $7.99/mo)
 *   - Monthly ($7.99/mo, no trial)
 *   - Yearly ($59.99/yr, save 37%)
 *
 * Yearly is preselected — best value, anchors the decision.
 */

import { useState } from 'react'
import { cn } from '@talkingo/shared/utils'
import {
  Sparkles, Check, Zap, MessageCircle, Phone, Users, Crown, AlertCircle,
} from 'lucide-react'
import { authFetch } from '@/lib/api/auth-fetch'
import { PUBLIC_PLAN_LIST, type PlanId } from '@/lib/subscription/public-plans'

interface PaywallProps {
  userEmail?: string
  userId?: string
  /** Optional close handler — when omitted the paywall is non-dismissible */
  onClose?: () => void
}

const FEATURES = [
  { icon: MessageCircle, text: 'Unlimited conversations' },
  { icon: Phone, text: 'Live voice calls with AI' },
  { icon: Users, text: 'All 6 AI personas' },
  { icon: Zap, text: 'All 12 levels unlocked' },
  { icon: Sparkles, text: 'Premium voices & teaching cards' },
  { icon: Crown, text: 'Full session recaps & history' },
]

export function Paywall({ userEmail, onClose }: PaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubscribe = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await authFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, email: userEmail }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      if (res.status === 409) {
        setErrorMsg(data.message || 'You already have an active subscription.')
      } else {
        setErrorMsg('Could not start checkout. Please try again.')
      }
      setLoading(false)
    } catch (err) {
      console.error('[Paywall] Error:', err)
      setErrorMsg('Connection issue. Check your network and try again.')
      setLoading(false)
    }
  }

  const ctaLabel = (() => {
    if (loading) return 'Redirecting...'
    if (selectedPlan === 'trial') return 'Start trial — $1 for 5 days'
    if (selectedPlan === 'yearly') return 'Subscribe yearly — $59.99'
    return 'Subscribe monthly — $7.99'
  })()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-5 animate-fade-in py-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Unlock Talkingo
          </h1>
          <p className="text-sm text-muted-foreground">
            Speak fluently. Choose what works for you.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2 px-1">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{text}</span>
              <Check className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Plan selector — 3 stacked cards */}
        <div className="space-y-2">
          {PUBLIC_PLAN_LIST.map((plan) => {
            const selected = selectedPlan === plan.id
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'relative w-full p-3.5 rounded-2xl border-2 transition-all text-left flex items-center gap-3',
                  selected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/40 hover:border-border/60'
                )}
              >
                {/* Radio circle */}
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                    selected ? 'border-primary' : 'border-border'
                  )}
                >
                  {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>

                {/* Label + pitch */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{plan.label}</p>
                    {plan.savingsLabel && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white uppercase">
                        {plan.savingsLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {plan.pitch}
                  </p>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-foreground leading-none">
                    {plan.priceLabel}
                    <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                      {plan.periodLabel}
                    </span>
                  </p>
                  {plan.subtitle && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{plan.subtitle}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-white font-bold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {ctaLabel}
        </button>

        {/* Optional dismiss */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            Maybe later
          </button>
        )}

        {/* Fine print */}
        <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed px-2">
          Cancel anytime from your profile. Subscription auto-renews. Tax may apply.
        </p>
      </div>
    </div>
  )
}
