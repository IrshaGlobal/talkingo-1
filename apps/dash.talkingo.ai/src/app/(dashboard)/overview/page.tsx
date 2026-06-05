'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin-fetch'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Users, Activity, Clock, TrendingUp, TrendingDown,
  CheckCircle, AlertTriangle, Globe, RefreshCw, Zap, Database, DollarSign,
} from 'lucide-react'

interface OverviewData {
  totalUsers: number
  totalSessions: number
  activeUsers: number
  sessions7d: number
  sessions30d: number
  avgDuration: number
  abandonmentRate: number
  completionRate: number
  levelDistribution: Record<number, number>
  languageDistribution: Record<string, number>
  sessionsPerDay: Array<{ date: string; count: number; avgDuration: number }>
  efficiency: {
    storageSavedMB: number
    apiCallsSaved: number
    estimatedCostSavedUSD: number
  }
}

/* Cyan → violet gradient steps for level bars */
const LEVEL_COLORS: Record<number, string> = {
  1: '#00e5ff',
  2: '#22d3ee',
  3: '#38bdf8',
  4: '#818cf8',
  5: '#a78bfa',
  6: '#c084fc',
  7: '#00e5ff',
  8: '#22d3ee',
  9: '#38bdf8',
  10: '#818cf8',
  11: '#a78bfa',
  12: '#c084fc',
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  ja: 'Japanese', ko: 'Korean', zh: 'Mandarin', it: 'Italian',
  pt: 'Portuguese', ar: 'Arabic', ru: 'Russian', hi: 'Hindi',
  tr: 'Turkish', nl: 'Dutch', pl: 'Polish', vi: 'Vietnamese',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

/* ── Shared chart styles ─────────────────────────────────────────────────── */
const chartTooltipStyle = {
  backgroundColor: '#161921',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  color: '#f0f4f8',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}
const axisTickStyle = { fill: '#5e6878', fontSize: 11 }
const gridStyle = { stroke: 'rgba(255,255,255,0.04)', strokeDasharray: '4 4' }

/* ── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'cyan',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'cyan' | 'emerald' | 'violet' | 'sky' | 'rose' | 'amber'
}) {
  const colorMap: Record<string, string> = {
    cyan:    'bg-primary/10 text-primary',
    emerald: 'bg-success/10 text-success',
    violet:  'bg-accent/10 text-accent',
    sky:     'bg-info/10 text-info',
    rose:    'bg-error/10 text-error',
    amber:   'bg-warning/10 text-warning',
  }

  return (
    <div className="group relative bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-border-medium transition-all duration-200">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      <div className="relative">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
        {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/overview')
      if (!res.ok) throw new Error('Failed to load overview data')
      const json = await res.json()
      setData(json)
      setLastRefreshed(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const levelChartData = data
    ? Object.entries(data.levelDistribution).map(([level, count]) => ({ level: parseInt(level), count }))
    : []

  const topLanguages = data
    ? Object.entries(data.languageDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([code, count]) => ({ name: LANG_NAMES[code] ?? code.toUpperCase(), count }))
    : []

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Overview</h1>
          <p className="text-sm text-text-secondary mt-1">
            Platform health at a glance · Updated {lastRefreshed.toLocaleTimeString()}
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

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-error/8 border border-error/25 rounded-xl text-error text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error} — showing cached data if available.
        </div>
      )}

      {/* ── Skeleton ───────────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-surface-2/90 border border-border-subtle rounded-2xl p-5 animate-pulse">
              <div className="w-10 h-10 bg-surface-3/60 rounded-xl mb-4" />
              <div className="h-2.5 bg-surface-3/50 rounded w-24 mb-2" />
              <div className="h-7 bg-surface-3/60 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── Stat grid ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Total Users"           value={data.totalUsers.toLocaleString()}   color="cyan" />
            <StatCard
              icon={Activity}
              label="Active Users (7d)"
              value={data.activeUsers.toLocaleString()}
              sub={`${data.totalUsers > 0 ? ((data.activeUsers / data.totalUsers) * 100).toFixed(1) : 0}% of total`}
              color="emerald"
            />
            <StatCard
              icon={TrendingUp}
              label="Sessions (7d)"
              value={data.sessions7d.toLocaleString()}
              sub={`${data.sessions30d.toLocaleString()} in last 30d`}
              color="violet"
            />
            <StatCard icon={Clock}       label="Avg Session Duration"  value={formatDuration(data.avgDuration)}   color="sky" />
            <StatCard
              icon={CheckCircle}
              label="Completion Rate (30d)"
              value={`${data.completionRate}%`}
              color="emerald"
            />
            <StatCard
              icon={TrendingDown}
              label="Abandonment Rate (30d)"
              value={`${data.abandonmentRate}%`}
              color="rose"
            />
            <StatCard icon={Activity}    label="Total Sessions"        value={data.totalSessions.toLocaleString()} color="amber" />
            <StatCard icon={Globe}       label="Languages Active"      value={Object.keys(data.languageDistribution).length} color="cyan" />
          </div>

          {/* ── Efficiency section ───────────────────────────────────────── */}
          {data.efficiency && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                Resource Efficiency Engine
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Storage */}
                <div className="relative overflow-hidden bg-surface-2/90 border border-primary/20 rounded-2xl p-5 group hover:border-primary/35 transition-all shadow-card">
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-all pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                  <div className="relative">
                    <Database className="w-7 h-7 text-primary mb-3" />
                    <p className="text-xs text-text-secondary mb-1">Storage Saved (Stateless Model)</p>
                    <p className="text-2xl font-bold text-text-primary">{data.efficiency.storageSavedMB} MB</p>
                    <p className="text-xs text-primary/70 mt-2">~98% reduction vs. full transcripts</p>
                  </div>
                </div>

                {/* API calls */}
                <div className="relative overflow-hidden bg-surface-2/90 border border-success/20 rounded-2xl p-5 group hover:border-success/35 transition-all shadow-card">
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-success/10 rounded-full blur-2xl group-hover:bg-success/15 transition-all pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                  <div className="relative">
                    <Activity className="w-7 h-7 text-success mb-3" />
                    <p className="text-xs text-text-secondary mb-1">API Calls Avoided</p>
                    <p className="text-2xl font-bold text-text-primary">{data.efficiency.apiCallsSaved.toLocaleString()}</p>
                    <p className="text-xs text-success/70 mt-2">Via batched progress updates</p>
                  </div>
                </div>

                {/* Cost savings */}
                <div className="relative overflow-hidden bg-surface-2/90 border border-warning/20 rounded-2xl p-5 group hover:border-warning/35 transition-all shadow-card">
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-warning/10 rounded-full blur-2xl group-hover:bg-warning/15 transition-all pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                  <div className="relative">
                    <DollarSign className="w-7 h-7 text-warning mb-3" />
                    <p className="text-xs text-text-secondary mb-1">Estimated Cost Savings</p>
                    <p className="text-2xl font-bold text-text-primary">${data.efficiency.estimatedCostSavedUSD}</p>
                    <p className="text-xs text-warning/70 mt-2">Real-time economic impact</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Charts row ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sessions per day */}
            <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl p-5 shadow-card">
              <h2 className="text-sm font-semibold text-text-primary mb-5">Sessions — Last 7 Days</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sessionsPerDay} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="date" tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#00e5ff"
                      strokeWidth={2}
                      dot={{ fill: '#00e5ff', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#00e5ff', strokeWidth: 0 }}
                      name="Sessions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Level distribution */}
            <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl p-5 shadow-card">
              <h2 className="text-sm font-semibold text-text-primary mb-5">Level Distribution</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={levelChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="level" tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]} name="Users">
                      {levelChartData.map((entry) => (
                        <Cell key={entry.level} fill={LEVEL_COLORS[entry.level] ?? '#00e5ff'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Language distribution ─────────────────────────────────────── */}
          {topLanguages.length > 0 && (
            <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl p-5 shadow-card">
              <h2 className="text-sm font-semibold text-text-primary mb-5">Top Languages Being Learned</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {topLanguages.map((lang, i) => (
                  <div
                    key={lang.name}
                    className="text-center p-4 bg-surface-3/40 hover:bg-surface-3/70 rounded-xl border border-border-subtle hover:border-border-medium transition-all"
                  >
                    <p className="text-xl font-bold text-primary">{lang.count}</p>
                    <p className="text-xs text-text-secondary mt-1">{lang.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
