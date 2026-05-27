'use client'

/**
 * UpgradePrompt — contextual upgrade nudge for free users hitting a limit.
 * Smaller than the full Paywall but uses the same 3-plan model.
 */

import { useState } from 'react'
import { cn } from '@talkingo/shared/utils'
import {
  Crown, MessageCircle, Phone, Users,
  Zap, Mic, Clock, BookOpen, X, Sparkles, AlertCircle,
} from 'lucide-react'
import { authFetch } from '@/lib/api/auth-fetch'
import { PUBLIC_PLAN_LIST, type PlanId } from '@/lib/subscription/public-plans'

export type UpgradeReason =
  | 'messages'
  | 'mode'
  | 'persona'
  | 'level'
  | 'voice'
  | 'history'
  | 'phrasebank'

interface UpgradePromptProps {
  reason: UpgradeReason
  onClose: () => void
  userEmail?: string
  userId?: string
  /** Extra context (e.g., persona name) */
  context?: string
}

const UPGRADE_COPY: Record<UpgradeReason, { icon: typeof Crown; title: string; subtitle: string }> = {
  messages: {
    icon: MessageCircle,
    title: "You've used all 6 messages today",
    subtitle: "Upgrade for unlimited conversations.",
  },
  mode: {
    icon: Phone,
    title: 'Voice modes are Premium',
    subtitle: 'Handsfree and Live Call let you practice speaking naturally.',
  },
  persona: {
    icon: Users,
    title: 'This persona is Premium',
    subtitle: 'Unlock all 6 personas to find your perfect practice partner.',
  },
  level: {
    icon: Zap,
    title: 'Levels 5-12 are Premium',
    subtitle: "Unlock advanced levels to reach fluency.",
  },
  voice: {
    icon: Mic,
    title: 'Voice messages are Premium',
    subtitle: 'Record voice messages with real-time pronunciation feedback.',
  },
  history: {
    icon: Clock,
    title: 'Full history is Premium',
    subtitle: 'Review every past conversation and track your improvement.',
  },
  phrasebank: {
    icon: BookOpen,
    title: 'Phrase Bank is Premium',
    subtitle: 'Save and review vocabulary from your sessions.',
  },
}

export function UpgradePrompt({ reason, onClose, userEmail, context }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const copy = UPGRADE_COPY[reason]
  const Icon = copy.icon

  const handleUpgrade = async () => {
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
      setErrorMsg(data.message || 'Could not start checkout. Please try again.')
      setLoading(false)
    } catch (err) {
      console.error('[UpgradePrompt] Error:', err)
      setErrorMsg('Connection issue. Try again.')
      setLoading(false)
    }
  }

  const ctaLabel = (() => {
    if (loading) return 'Redirecting...'
    if (selectedPlan === 'trial') return 'Start $1 trial'
    if (selectedPlan === 'yearly') return 'Subscribe yearly'
    return 'Subscribe monthly'
  })()

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card border border-border/50 rounded-3xl shadow-2xl animate-slide-up overflow-hidden max-h-[95vh] overflow-y-auto">

        <div className="flex justify-end p-3 pb-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-display text-base font-bold tracking-tight">
              {copy.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {context ? copy.subtitle.replace('This persona', context) : copy.subtitle}
            </p>
          </div>

          {/* Plans */}
          <div className="space-y-2">
            {PUBLIC_PLAN_LIST.map((plan) => {
              const selected = selectedPlan === plan.id
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    'w-full p-3 rounded-xl border-2 text-left flex items-center gap-2.5 transition-all',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border/40 hover:border-border/60'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                      selected ? 'border-primary' : 'border-border'
                    )}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground">{plan.label}</p>
                      {plan.savingsLabel && (
                        <span className="px-1 py-0.5 rounded-full bg-emerald-500 text-[8px] font-bold text-white uppercase">
                          {plan.savingsLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-foreground flex-shrink-0">
                    {plan.priceLabel}
                    <span className="text-[9px] font-medium text-muted-foreground ml-0.5">
                      {plan.periodLabel}
                    </span>
                  </p>
                </button>
              )
            })}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 dark:text-red-400">{errorMsg}</p>
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {ctaLabel}
          </button>

          <p className="text-center text-[9px] text-muted-foreground/50">
            Cancel anytime from your profile.
          </p>
        </div>
      </div>
    </div>
  )
}
