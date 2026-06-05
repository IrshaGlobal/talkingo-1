'use client'

/**
 * PaymentSuccessDialog — celebratory confirmation shown after a successful
 * Stripe checkout return (?subscription=success). Lists newly unlocked
 * premium features so the moment feels rewarding instead of silent.
 */

import { Sparkles, Check, MessageCircle, Phone, Users, Zap, Crown, BookOpen } from 'lucide-react'

interface PaymentSuccessDialogProps {
  onClose: () => void
  trialEndsAt?: number
  plan?: 'monthly' | 'yearly'
}

const UNLOCKED = [
  { icon: MessageCircle, text: 'Unlimited daily conversations' },
  { icon: Phone, text: 'Live Call & Handsfree modes' },
  { icon: Users, text: 'All 6 AI personas' },
  { icon: Zap, text: 'All 12 levels' },
  { icon: BookOpen, text: 'Full session recaps & phrase bank' },
]

function formatTrialEnd(ts?: number): string | null {
  if (!ts) return null
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

export function PaymentSuccessDialog({ onClose, trialEndsAt, plan }: PaymentSuccessDialogProps) {
  const trialEndLabel = formatTrialEnd(trialEndsAt)
  const hasTrial = !!trialEndsAt
  const billingAmount = plan === 'yearly' ? '$59.99/year' : '$7.99/month'
  const planLabel = plan === 'yearly' ? 'Yearly' : 'Monthly'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {hasTrial ? 'Welcome to Premium!' : 'Subscription Active!'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasTrial
              ? `Your 5-day trial starts now.${trialEndLabel ? ` Free access until ${trialEndLabel}.` : ''}`
              : `Your ${planLabel} plan is now active. ${billingAmount} — enjoy unlimited access.`
            }
          </p>
        </div>

        {/* Unlocked features */}
        <div className="bg-card/50 border border-border/40 rounded-2xl p-4 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Just unlocked
          </p>
          {UNLOCKED.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{text}</span>
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-white font-bold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" />
          Start Speaking
        </button>

        {/* Fine print */}
        <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed px-4">
          {hasTrial
            ? trialEndLabel
              ? `${billingAmount} starts ${trialEndLabel}. Cancel anytime from your profile.`
              : `${billingAmount} after trial. Cancel anytime from your profile.`
            : `Cancel anytime from your profile.`}
        </p>
      </div>
    </div>
  )
}
