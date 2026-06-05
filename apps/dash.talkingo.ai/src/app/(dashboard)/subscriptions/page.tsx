'use client'

import { useState, useEffect, useMemo } from 'react'
import { ExternalLink, CreditCard, Users, AlertCircle, DollarSign, Search, XCircle, Loader2, Ban } from 'lucide-react'
import { adminFetch } from '@/lib/admin-fetch'

interface SubscriptionData {
  id: string
  customerId: string
  status: string
  plan: string
  amount: number
  currentPeriodEnd: string
  trialEnd?: string
  email?: string
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ active: 0, trialing: 0, canceled: 0, mrr: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const res = await adminFetch('/api/subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubscriptions(data.subscriptions || [])
        setStats(data.stats || { active: 0, trialing: 0, canceled: 0, mrr: 0 })
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (subscriptionId: string) => {
    setCancelingId(subscriptionId)
    setCancelError('')
    try {
      const res = await adminFetch('/api/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })
      if (res.ok) {
        setConfirmCancelId(null)
        fetchSubscriptions()
      } else {
        const data = await res.json().catch(() => ({}))
        setCancelError(data.error || 'Failed to cancel subscription')
      }
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel subscription')
    } finally {
      setCancelingId(null)
    }
  }

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const query = search.toLowerCase()
      const matchesSearch =
        !query ||
        sub.email?.toLowerCase().includes(query) ||
        sub.customerId?.toLowerCase().includes(query) ||
        sub.id?.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
      const matchesPlan = planFilter === 'all' || sub.plan === planFilter
      return matchesSearch && matchesStatus && matchesPlan
    })
  }, [subscriptions, search, statusFilter, planFilter])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Subscriptions</h1>
        <p className="text-sm text-text-tertiary mt-1">Manage user subscriptions and revenue</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          icon={<Users className="w-5 h-5" />}
          label="Active"
          value={stats.active}
          colorClass="text-success bg-success/10"
        />
        <PremiumStatCard
          icon={<CreditCard className="w-5 h-5" />}
          label="Trialing"
          value={stats.trialing}
          colorClass="text-info bg-info/10"
        />
        <PremiumStatCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Canceled"
          value={stats.canceled}
          colorClass="text-error bg-error/10"
        />
        <PremiumStatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="MRR"
          value={`$${(stats.mrr / 100).toFixed(2)}`}
          colorClass="text-primary bg-primary/10"
        />
      </div>

      <div className="flex gap-3 flex-wrap">
        <a
          href="https://dashboard.stripe.com/subscriptions"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-background text-sm font-semibold shadow-glow-sm hover:shadow-glow-primary hover:brightness-110 transition-all duration-200"
        >
          <ExternalLink className="w-4 h-4" />
          Stripe Dashboard
        </a>
        <button
          onClick={fetchSubscriptions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-2 border border-border-subtle text-text-secondary text-sm font-medium hover:text-text-primary hover:bg-surface-3 transition-all duration-200"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by email, customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-surface-2 border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="canceled">Canceled</option>
          <option value="past_due">Past Due</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-surface-2 border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all"
        >
          <option value="all">All Plans</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        {filteredSubscriptions.length !== subscriptions.length && (
          <span className="text-xs text-text-tertiary">
            Showing {filteredSubscriptions.length} of {subscriptions.length}
          </span>
        )}
      </div>

      {cancelError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-sm text-error">
          <Ban className="w-4 h-4 flex-shrink-0" />
          {cancelError}
        </div>
      )}

      <div className="relative">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/5 to-accent/3 pointer-events-none" />
        <div className="relative rounded-2xl bg-surface-2/90 backdrop-blur-xl border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Next billing</th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-3 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-text-tertiary" />
                      </div>
                      <p className="text-sm text-text-tertiary">
                        {subscriptions.length === 0 ? 'No subscriptions yet' : 'No subscriptions match your filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-surface-3/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{sub.email || sub.customerId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-text-primary text-sm">
                      ${(sub.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-text-tertiary text-sm">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due' ? (
                        confirmCancelId === sub.id ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-text-tertiary">Cancel?</span>
                            <button
                              onClick={() => handleCancel(sub.id)}
                              disabled={cancelingId === sub.id}
                              className="px-2.5 py-1 rounded-lg bg-error/15 text-error text-xs font-semibold border border-error/20 hover:bg-error/25 transition-colors disabled:opacity-50"
                            >
                              {cancelingId === sub.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Confirm'
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              className="px-2 py-1 rounded-lg bg-surface-3 text-text-tertiary text-xs border border-border-subtle hover:text-text-secondary transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmCancelId(sub.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-3 text-text-tertiary text-xs font-medium border border-border-subtle hover:text-error hover:bg-error/8 hover:border-error/20 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg pointer-events-none" />
        <div className="relative rounded-2xl bg-surface-2/90 backdrop-blur-xl border border-border-subtle p-6 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg text-text-primary">Pricing Configuration</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Trial', price: '$1.00', sub: '5 days', accent: 'from-warning/20 to-warning/5' },
              { label: 'Monthly', price: '$7.99', sub: '/month', accent: 'from-primary/20 to-primary/5' },
              { label: 'Yearly', price: '$59.99', sub: '/year (save 37%)', accent: 'from-accent/20 to-accent/5' },
            ].map((tier) => (
              <div key={tier.label} className="relative group/tier">
                <div className={`absolute -inset-px rounded-xl bg-gradient-to-br ${tier.accent} opacity-0 group-hover/tier:opacity-100 transition-opacity duration-300 blur-md pointer-events-none`} />
                <div className="relative p-4 rounded-xl bg-surface-3/50 border border-border-subtle hover:border-border-medium transition-colors">
                  <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider">{tier.label}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{tier.price}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{tier.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            To change pricing, update prices in the Stripe Dashboard and update the price IDs in{' '}
            <code className="px-1.5 py-0.5 bg-surface-3 rounded text-xs text-text-secondary">/api/stripe/checkout/route.ts</code>
          </p>
        </div>
      </div>
    </div>
  )
}

function PremiumStatCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  colorClass: string
}) {
  return (
    <div className="relative group">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/15 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg pointer-events-none" />
      <div className="relative bg-surface-2/90 backdrop-blur-xl border border-border-subtle rounded-2xl p-5 shadow-card group-hover:shadow-card-hover transition-shadow duration-300">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        <div className="relative">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
            {icon}
          </div>
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    trialing: 'bg-info/10 text-info border-info/20',
    past_due: 'bg-warning/10 text-warning border-warning/20',
    canceled: 'bg-error/10 text-error border-error/20',
    unpaid: 'bg-surface-3 text-text-tertiary border-border-medium',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.unpaid}`}>
      {status}
    </span>
  )
}
