'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, UserCheck, MessageSquare, TrendingUp, Search, RefreshCw, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminFetch } from '@/lib/admin-fetch'

interface EnrichedUser {
  id: string
  email: string
  name: string
  status: boolean
  emailVerification: boolean
  labels: string[]
  createdAt: string
  talkLevel: number | null
  targetLanguage: string | null
  learningGoal: string | null
  onboardingComplete: boolean
  sessionsLast7d: number
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  ja: 'Japanese', ko: 'Korean', zh: 'Mandarin', it: 'Italian',
  ar: 'Arabic', ru: 'Russian', hi: 'Hindi', tr: 'Turkish',
  nl: 'Dutch', pl: 'Polish', vi: 'Vietnamese', pt: 'Portuguese',
}

export default function LearnersPage() {
  const [users, setUsers] = useState<EnrichedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/users?limit=200')
      if (!res.ok) throw new Error('Failed to load users')
      const json = await res.json()
      setUsers(json.users ?? [])
      setLastRefreshed(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() =>
    users.filter(u =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
    ), [users, search])

  // Derived stats
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.sessionsLast7d > 0).length
  const avgSessions = totalUsers > 0
    ? (users.reduce((a, u) => a + u.sessionsLast7d, 0) / totalUsers).toFixed(1)
    : '0'
  const onboarded = users.filter(u => u.onboardingComplete).length

  // Level distribution
  const levelDist: Record<number, number> = {}
  for (let i = 1; i <= 12; i++) levelDist[i] = 0
  for (const u of users) {
    if (u.talkLevel && levelDist[u.talkLevel] !== undefined) levelDist[u.talkLevel]++
  }
  const levelData = Object.entries(levelDist).map(([level, count]) => ({ level: parseInt(level), count }))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Learner Overview</h1>
          <p className="text-sm text-text-secondary mt-1">
            All registered users · Updated {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/15 border border-primary/25 hover:border-primary/40 text-primary rounded-xl transition-all text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-error/8 border border-error/25 rounded-xl text-error text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,        label: 'Total Users',           value: totalUsers.toLocaleString(),   color: 'bg-primary/10 text-primary' },
          { icon: UserCheck,    label: 'Active (7d)',            value: activeUsers.toLocaleString(),  sub: `${totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0}% of total`, color: 'bg-success/10 text-success' },
          { icon: MessageSquare,label: 'Avg Sessions/User (7d)', value: avgSessions,                   color: 'bg-accent/10 text-accent' },
          { icon: TrendingUp,   label: 'Onboarded',             value: onboarded.toLocaleString(),    sub: `${totalUsers > 0 ? ((onboarded / totalUsers) * 100).toFixed(1) : 0}% of total`, color: 'bg-info/10 text-info' },
        ].map(card => (
          <div key={card.label} className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-border-medium transition-all">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-text-primary tracking-tight">{card.value}</p>
            {card.sub && <p className="text-xs text-text-tertiary mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Level Chart */}
      <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl p-5 shadow-card">
        <h2 className="text-sm font-semibold text-text-primary mb-5">Level Distribution</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={levelData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="level" tick={{ fill: '#5e6878', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5e6878', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#161921', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#f0f4f8', fontSize: '12px' }} />
              <Bar dataKey="count" fill="#00e5ff" radius={[5, 5, 0, 0]} name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 border-b border-border-subtle">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-3/60 border border-border-medium rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-subtle">
              <tr>
                {['User', 'Level', 'Language', 'Goal', 'Sessions (7d)', 'Status', 'Joined'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading && users.length === 0 ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-3/50 rounded-lg animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-surface-3/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center text-background text-xs font-bold flex-shrink-0">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                          {u.name || 'Unknown'}
                          {u.labels.includes('admin') && (
                            <Shield className="w-3 h-3 text-primary" />
                          )}
                        </div>
                        <div className="text-xs text-text-tertiary">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.talkLevel ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        Level {u.talkLevel}
                      </span>
                    ) : <span className="text-xs text-text-tertiary">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">
                    {u.targetLanguage ? (LANG_NAMES[u.targetLanguage] ?? u.targetLanguage.toUpperCase()) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-primary capitalize">
                    {u.learningGoal?.replace('-', ' ') ?? '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-medium ${u.sessionsLast7d > 0 ? 'text-success' : 'text-text-tertiary'}`}>
                      {u.sessionsLast7d}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.status ? (
                      <div className="flex items-center gap-1.5 text-success text-xs">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-error text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Blocked
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-text-tertiary">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">{users.length === 0 ? 'No users yet.' : 'No users match your search.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
