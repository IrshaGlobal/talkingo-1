'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Clock, AlertTriangle, Filter } from 'lucide-react'
import { adminFetch } from '@/lib/admin-fetch'

interface SessionDoc {
  $id: string
  sessionId: string
  userId: string
  targetLanguage: string
  seedId: string
  seedTitle: string
  durationSeconds: number
  messageCount: number
  correctionCount: number
  vocabIntroduced: number
  unitComplete: boolean
  abandoned: boolean
  timestamp: number
  domainScoresBefore?: string
  domainScoresAfter?: string
}

interface SessionStats {
  total: number
  avgDuration: number
  avgCorrections: number
  abandonmentRate: number
  completionRate: number
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

function anonymize(userId: string): string {
  return `${userId.slice(0, 6)}…${userId.slice(-4)}`
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  ja: 'Japanese', ko: 'Korean', zh: 'Mandarin', it: 'Italian',
  ar: 'Arabic', ru: 'Russian', hi: 'Hindi', tr: 'Turkish',
  nl: 'Dutch', pl: 'Polish', vi: 'Vietnamese', pt: 'Portuguese',
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionDoc[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(1)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`/api/sessions?days=${days}&limit=200`)
      if (!res.ok) throw new Error('Failed to load sessions')
      const json = await res.json()
      setSessions(json.sessions ?? [])
      setStats(json.stats ?? null)
      setLastRefreshed(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Session Feed</h1>
          <p className="text-sm text-text-secondary mt-1">
            Live conversation sessions · Updated {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-2/90 border border-border-subtle rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-text-tertiary" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-transparent text-sm text-text-primary outline-none"
            >
              <option value={1}>Last 24h</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={0}>All time</option>
            </select>
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
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-error/8 border border-error/25 rounded-xl text-error text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Sessions',   value: stats.total.toLocaleString(),        color: '' },
            { label: 'Avg Duration',     value: formatDuration(stats.avgDuration),   color: '' },
            { label: 'Avg Corrections',  value: stats.avgCorrections.toFixed(1),     color: '' },
            { label: 'Completion Rate',  value: `${stats.completionRate}%`,          color: 'text-success' },
            { label: 'Abandonment Rate', value: `${stats.abandonmentRate}%`,         color: 'text-error' },
          ].map(s => (
            <div key={s.label} className="bg-surface-2/90 backdrop-blur border border-border-subtle p-4 rounded-2xl shadow-card">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color || 'text-text-primary'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-subtle">
              <tr>
                {['User', 'Language', 'Seed', 'Duration', 'Messages', 'Corrections', 'Status', 'Time'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading && sessions.length === 0 ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-3/50 rounded-lg animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sessions.map((s) => (
                <tr key={s.$id} className="hover:bg-surface-3/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono text-text-tertiary">{anonymize(s.userId)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info border border-info/20">
                      {LANG_NAMES[s.targetLanguage] ?? s.targetLanguage.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-text-primary max-w-[160px] truncate">{s.seedTitle}</div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">{formatDuration(s.durationSeconds)}</td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">{s.messageCount}</td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">{s.correctionCount}</td>
                  <td className="px-5 py-3.5">
                    {s.abandoned ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">Abandoned</span>
                    ) : s.unitComplete ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">Completed</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">Partial</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-text-tertiary">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(s.timestamp)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && sessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">No sessions found for this time range.</p>
          </div>
        )}
      </div>
    </div>
  )
}
