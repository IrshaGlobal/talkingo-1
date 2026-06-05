'use client'

import { useState, useMemo, useEffect } from 'react'
import { ArrowUpDown, Search, RefreshCw, AlertTriangle } from 'lucide-react'
import { adminFetch } from '@/lib/admin-fetch'

interface SeedPerf {
  seedId: string
  seedTitle: string
  totalSessions: number
  completedSessions: number
  abandonedSessions: number
  totalCorrections: number
  completionRate: number
  abandonmentRate: number
  avgCorrectionsPerSession: number
  avgDurationSeconds: number
}

type SortKey = keyof SeedPerf
type SortDirection = 'asc' | 'desc'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function SeedsPage() {
  const [seeds, setSeeds] = useState<SeedPerf[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('totalSessions')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/seeds')
      if (!res.ok) throw new Error('Failed to load seed analytics')
      const json = await res.json()
      setSeeds(json.seeds ?? [])
      setLastRefreshed(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const sortedAndFiltered = useMemo(() => {
    let filtered = seeds.filter(s =>
      s.seedTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.seedId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return filtered.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDirection === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
    })
  }, [seeds, sortKey, sortDirection, searchTerm])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary" />
    return <ArrowUpDown className={`w-3.5 h-3.5 text-primary ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Seed Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real conversation seed performance · Updated {lastRefreshed.toLocaleTimeString()}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search seeds..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface-2/90 border border-border-medium rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-subtle">
              <tr>
                {[
                  { key: 'seedTitle' as SortKey, label: 'Seed Title' },
                  { key: 'totalSessions' as SortKey, label: 'Total Sessions' },
                  { key: 'completionRate' as SortKey, label: 'Completion Rate' },
                  { key: 'abandonmentRate' as SortKey, label: 'Abandonment Rate' },
                  { key: 'avgCorrectionsPerSession' as SortKey, label: 'Avg Corrections' },
                  { key: 'avgDurationSeconds' as SortKey, label: 'Avg Duration' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3.5 text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      <SortIcon columnKey={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading && seeds.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-3/50 rounded-lg animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedAndFiltered.map((seed) => (
                <tr key={seed.seedId} className="hover:bg-surface-3/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-text-primary">{seed.seedTitle}</div>
                    <div className="text-xs text-text-tertiary font-mono mt-0.5">{seed.seedId}</div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">{seed.totalSessions.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-semibold ${
                      seed.completionRate >= 75 ? 'text-success' :
                      seed.completionRate >= 60 ? 'text-warning' : 'text-error'
                    }`}>
                      {seed.completionRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-semibold ${
                      seed.abandonmentRate <= 10 ? 'text-success' :
                      seed.abandonmentRate <= 20 ? 'text-warning' : 'text-error'
                    }`}>
                      {seed.abandonmentRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">{seed.avgCorrectionsPerSession.toFixed(1)}</td>
                  <td className="px-5 py-3.5 text-sm text-text-primary">{formatDuration(seed.avgDurationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && sortedAndFiltered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary">{seeds.length === 0 ? 'No session data yet.' : 'No seeds match your search.'}</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {seeds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Seeds',        value: seeds.length,                                                                                    color: '' },
            { label: 'Avg Completion Rate', value: `${(seeds.reduce((a, s) => a + s.completionRate, 0) / seeds.length).toFixed(1)}%`,              color: 'text-primary' },
            { label: 'Total Sessions',     value: seeds.reduce((a, s) => a + s.totalSessions, 0).toLocaleString(),                                 color: '' },
            { label: 'Avg Abandonment',    value: `${(seeds.reduce((a, s) => a + s.abandonmentRate, 0) / seeds.length).toFixed(1)}%`,              color: 'text-error' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-2/90 backdrop-blur border border-border-subtle p-5 rounded-2xl shadow-card">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color || 'text-text-primary'}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
