'use client'

/**
 * Subscription Expired / Re-subscribe UI.
 * Shown when a user's subscription has been canceled or expired.
 * Offers two paths: re-subscribe (new checkout) or manage billing (portal).
 *
 * The portal call no longer requires a customerId — the server looks it up
 * from the authenticated user's subscription doc, so this UI works even if
 * localStorage was cleared.
 */

import { useState } from 'react'
import { cn } from '@talkingo/shared/utils'
import { AlertTriangle, CreditCard, RefreshCw, Crown, ArrowRight, AlertCircle } from 'lucide-react'
import { authFetch } from '@/lib/api/auth-fetch'

interface SubscriptionExpiredProps {
  userEmail?: string
  userId?: string
  customerId?: string
  /** 'expired' | 'canceled' | 'past_due' */
  reason: 'expired' | 'canceled' | 'past_due'
}

export function SubscriptionExpired({ userEmail, userId, customerId, reason }: SubscriptionExpiredProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleResubscribe = async () => {
    setLoading('checkout')
    setErrorMsg(null)
    try {
      const res = await authFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, email: userEmail, userId }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setErrorMsg(data.message || 'Could not start checkout. Try again.')
      setLoading(null)
    } catch (err) {
      console.error('[ReSubscribe] Error:', err)
      setErrorMsg('Connection issue. Try again.')
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setLoading('portal')
    setErrorMsg(null)
    try {
      const res = await authFetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setErrorMsg(data.message || 'Could not open billing portal.')
      setLoading(null)
    } catch (err) {
      console.error('[ReSubscribe] Error:', err)
      setErrorMsg('Connection issue. Try again.')
      setLoading(null)
    }
  }

  const title = reason === 'past_due'
    ? 'Payment Issue'
    : reason === 'canceled'
      ? 'Subscription Canceled'
      : 'Subscription Expired'

  const subtitle = reason === 'past_due'
    ? 'Your last payment failed. Update your payment method to continue learning.'
    : reason === 'canceled'
      ? 'Your subscription has been canceled. Re-subscribe to continue your progress.'
      : 'Your subscription has expired. Pick up where you left off.'

  const Icon = reason === 'past_due' ? CreditCard : AlertTriangle

  // We can attempt to manage billing regardless of localStorage customerId now —
  // the server resolves it from the subscription doc. Past-due users always
  // benefit from the portal even if cached customerId is missing.
  const canManageBilling = reason === 'past_due' || !!customerId

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            {subtitle}
          </p>
        </div>

        {/* Past due: show "Update Payment" button prominently */}
        {reason === 'past_due' && (
          <button
            onClick={handleManageBilling}
            disabled={loading !== null}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-white font-bold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === 'portal' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {loading === 'portal' ? 'Redirecting...' : 'Update Payment Method'}
          </button>
        )}

        {/* Expired/Canceled: show plan picker + re-subscribe */}
        {reason !== 'past_due' && (
          <>
            {/* Plan selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={cn(
                  'relative p-4 rounded-2xl border-2 transition-all text-left',
                  selectedPlan === 'monthly'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/40 hover:border-border/60'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Monthly</p>
                <p className="text-xl font-bold text-foreground">$7.99</p>
                <p className="text-[10px] text-muted-foreground">/month</p>
              </button>

              <button
                onClick={() => setSelectedPlan('yearly')}
                className={cn(
                  'relative p-4 rounded-2xl border-2 transition-all text-left',
                  selectedPlan === 'yearly'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/40 hover:border-border/60'
                )}
              >
                <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white uppercase">
                  Save 37%
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Yearly</p>
                <p className="text-xl font-bold text-foreground">$59.99</p>
                <p className="text-[10px] text-muted-foreground">/year ($5/mo)</p>
              </button>
            </div>

            {/* Re-subscribe CTA */}
            <button
              onClick={handleResubscribe}
              disabled={loading !== null}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-white font-bold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'checkout' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              {loading === 'checkout' ? 'Redirecting...' : 'Re-subscribe Now'}
            </button>
          </>
        )}

        {/* Manage billing link (for expired/canceled users with a known customerId) */}
        {reason !== 'past_due' && canManageBilling && (
          <button
            onClick={handleManageBilling}
            disabled={loading !== null}
            className="w-full py-3 rounded-xl border border-border/40 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/60 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Manage Billing
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Fine print */}
        <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed px-4">
          {reason === 'past_due'
            ? 'Update your payment method to restore access. Your progress is saved.'
            : `Your progress and history are saved. ${selectedPlan === 'yearly' ? '$59.99/year' : '$7.99/month'} auto-renews. Cancel anytime.`
          }
        </p>
      </div>
    </div>
  )
}
