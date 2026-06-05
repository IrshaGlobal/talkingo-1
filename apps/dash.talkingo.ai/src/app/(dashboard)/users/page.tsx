'use client'

import { useState, useEffect, useMemo } from 'react'
import { adminFetch } from '@/lib/admin-fetch'
import {
  Search, RefreshCw, AlertTriangle, Shield, CheckCircle, XCircle,
  Ban, Unlock, Trash2, ChevronRight, X, User, Mail, Calendar,
  Activity, BookOpen, Globe, Target, Tag, Loader2,
} from 'lucide-react'

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

interface UserDetail {
  user: {
    id: string; email: string; name: string; status: boolean
    emailVerification: boolean; labels: string[]; createdAt: string
  }
  preferences: any
  progress: any[]
  sessions: any[]
  sessionCount: number
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  ja: 'Japanese', ko: 'Korean', zh: 'Mandarin', it: 'Italian',
  ar: 'Arabic', ru: 'Russian', hi: 'Hindi', tr: 'Turkish',
  nl: 'Dutch', pl: 'Polish', vi: 'Vietnamese', pt: 'Portuguese',
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function UsersPage() {
  const [users, setUsers] = useState<EnrichedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [mutationLoading, setMutationLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
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
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
    ), [users, search])

  const openDetail = async (userId: string) => {
    setDetailLoading(true)
    setSelectedUser(null)
    try {
      const res = await adminFetch(`/api/users/${userId}`)
      if (!res.ok) throw new Error('Failed to load user detail')
      const json = await res.json()
      setSelectedUser(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAction = async (userId: string, action: 'block' | 'unblock' | 'updateLabels', extra?: any) => {
    setMutationLoading(`${userId}-${action}`)
    setError(null)
    try {
      const res = await adminFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Action failed')
      }
      await load()
      if (selectedUser?.user.id === userId) {
        await openDetail(userId)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setMutationLoading(null)
    }
  }

  const handleDelete = async (userId: string) => {
    setMutationLoading(`${userId}-delete`)
    setError(null)
    try {
      const res = await adminFetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Delete failed')
      }
      setConfirmDelete(null)
      setSelectedUser(null)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setMutationLoading(null)
    }
  }

  const toggleAdminLabel = (user: EnrichedUser | UserDetail['user']) => {
    const labels = 'labels' in user ? user.labels : []
    const newLabels = labels.includes('admin')
      ? labels.filter((l: string) => l !== 'admin')
      : [...labels, 'admin']
    handleAction(user.id, 'updateLabels', { labels: newLabels })
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">User Management</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage all registered users · Updated {lastRefreshed.toLocaleTimeString()}
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
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:opacity-70 transition-opacity"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',  value: users.length },
          { label: 'Active (7d)', value: users.filter(u => u.sessionsLast7d > 0).length },
          { label: 'Blocked',     value: users.filter(u => !u.status).length },
          { label: 'Admins',      value: users.filter(u => u.labels.includes('admin')).length },
        ].map(s => (
          <div key={s.label} className="bg-surface-2/90 backdrop-blur border border-border-subtle p-4 rounded-2xl shadow-card">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* User List */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-border-subtle">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by name, email, or user ID..."
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
                    {['User', 'Level', 'Language', 'Sessions (7d)', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading && users.length === 0 ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-5 py-4"><div className="h-4 bg-surface-3/50 rounded-lg animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-surface-3/30 transition-colors cursor-pointer ${selectedUser?.user.id === u.id ? 'bg-primary/5' : ''}`}
                      onClick={() => openDetail(u.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-background text-xs font-bold flex-shrink-0 ${u.status ? 'bg-gradient-to-br from-primary to-primary-dim' : 'bg-surface-3/80 text-text-tertiary'}`}>
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary flex items-center gap-1">
                              {u.name || 'Unknown'}
                              {u.labels.includes('admin') && <Shield className="w-3 h-3 text-primary" />}
                            </div>
                            <div className="text-xs text-text-tertiary truncate max-w-[160px]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {u.talkLevel ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">Level {u.talkLevel}</span>
                        ) : <span className="text-xs text-text-tertiary">—</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-primary">
                        {u.targetLanguage ? (LANG_NAMES[u.targetLanguage] ?? u.targetLanguage.toUpperCase()) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-medium ${u.sessionsLast7d > 0 ? 'text-success' : 'text-text-tertiary'}`}>
                          {u.sessionsLast7d}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {u.status ? (
                          <div className="flex items-center gap-1.5 text-success text-xs"><CheckCircle className="w-3.5 h-3.5" /> Active</div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-error text-xs"><XCircle className="w-3.5 h-3.5" /> Blocked</div>
                        )}
                      </td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {u.status ? (
                            <button
                              onClick={() => handleAction(u.id, 'block')}
                              disabled={mutationLoading === `${u.id}-block`}
                              className="p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error/10 transition-all disabled:opacity-50"
                              title="Block user"
                            >
                              {mutationLoading === `${u.id}-block` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(u.id, 'unblock')}
                              disabled={mutationLoading === `${u.id}-unblock`}
                              className="p-1.5 rounded-lg text-text-tertiary hover:text-success hover:bg-success/10 transition-all disabled:opacity-50"
                              title="Unblock user"
                            >
                              {mutationLoading === `${u.id}-unblock` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            disabled={mutationLoading === `${u.id}-delete`}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error/10 transition-all disabled:opacity-50"
                            title="Delete user"
                          >
                            {mutationLoading === `${u.id}-delete` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => openDetail(u.id)}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/10 transition-all"
                            title="View details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

        {/* Detail Panel */}
        {(detailLoading || selectedUser) && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl overflow-hidden sticky top-6 shadow-card">
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">User Detail</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {detailLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 bg-surface-3/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : selectedUser && (
                <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-background text-base font-bold ${selectedUser.user.status ? 'bg-gradient-to-br from-primary to-primary-dim' : 'bg-surface-3/80 text-text-tertiary'}`}>
                      {(selectedUser.user.name || selectedUser.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{selectedUser.user.name || 'Unknown'}</p>
                      <p className="text-xs text-text-tertiary">{selectedUser.user.email}</p>
                    </div>
                  </div>

                  {/* Info rows */}
                  {[
                    { icon: User, label: 'User ID', value: selectedUser.user.id.slice(0, 16) + '…' },
                    { icon: Mail, label: 'Email verified', value: selectedUser.user.emailVerification ? 'Yes' : 'No' },
                    { icon: Calendar, label: 'Joined', value: new Date(selectedUser.user.createdAt).toLocaleDateString() },
                    { icon: Activity, label: 'Total sessions', value: selectedUser.sessionCount },
                    { icon: BookOpen, label: 'Level', value: selectedUser.preferences?.talkLevel ? `Level ${selectedUser.preferences.talkLevel}` : '—' },
                    { icon: Globe, label: 'Language', value: selectedUser.preferences?.targetLanguage ? (LANG_NAMES[selectedUser.preferences.targetLanguage] ?? selectedUser.preferences.targetLanguage) : '—' },
                    { icon: Target, label: 'Goal', value: selectedUser.preferences?.learningGoal?.replace('-', ' ') ?? '—' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2.5">
                      <row.icon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                      <span className="text-xs text-text-secondary w-24 flex-shrink-0">{row.label}</span>
                      <span className="text-xs text-text-primary font-medium capitalize">{String(row.value)}</span>
                    </div>
                  ))}

                  {/* Labels */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-text-tertiary" />
                      <span className="text-xs text-text-secondary">Labels</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.user.labels.length === 0 ? (
                        <span className="text-xs text-text-tertiary">None</span>
                      ) : selectedUser.user.labels.map((l: string) => (
                        <span key={l} className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{l}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recent sessions */}
                  {selectedUser.sessions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Recent Sessions</p>
                      <div className="space-y-1.5">
                        {selectedUser.sessions.slice(0, 5).map((s: any) => (
                          <div key={s.$id} className="flex items-center justify-between p-2 rounded-lg bg-surface-3/30 border border-border-subtle">
                            <div>
                              <p className="text-xs font-medium text-text-primary truncate max-w-[140px]">{s.seedTitle}</p>
                              <p className="text-[10px] text-text-tertiary">{formatDuration(s.durationSeconds)}</p>
                            </div>
                            {s.unitComplete ? (
                              <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                            ) : s.abandoned ? (
                              <XCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-border-subtle">
                    <button
                      onClick={() => toggleAdminLabel(selectedUser.user)}
                      disabled={!!mutationLoading}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 ${
                        selectedUser.user.labels.includes('admin')
                          ? 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15'
                          : 'bg-surface-3/50 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-medium'
                      }`}
                    >
                      {mutationLoading === `${selectedUser.user.id}-updateLabels` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Shield className="w-3.5 h-3.5" />
                      )}
                      {selectedUser.user.labels.includes('admin') ? 'Remove Admin' : 'Make Admin'}
                    </button>

                    {selectedUser.user.status ? (
                      <button
                        onClick={() => handleAction(selectedUser.user.id, 'block')}
                        disabled={!!mutationLoading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-error/8 border border-error/25 text-error hover:bg-error/15 transition-all disabled:opacity-50"
                      >
                        {mutationLoading === `${selectedUser.user.id}-block` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                        Block User
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(selectedUser.user.id, 'unblock')}
                        disabled={!!mutationLoading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-success/8 border border-success/25 text-success hover:bg-success/15 transition-all disabled:opacity-50"
                      >
                        {mutationLoading === `${selectedUser.user.id}-unblock` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        Unblock User
                      </button>
                    )}

                    <button
                      onClick={() => setConfirmDelete(selectedUser.user.id)}
                      disabled={!!mutationLoading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-error/8 border border-error/25 text-error hover:bg-error/15 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete User
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="relative bg-surface-2 border border-border-medium rounded-2xl p-6 max-w-sm w-full mx-4 shadow-card-hover">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-error" />
              </div>
              <h3 className="text-base font-semibold text-text-primary text-center mb-2">Delete User?</h3>
              <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed">
                This will permanently delete the user account and all associated data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border-medium text-text-secondary hover:text-text-primary hover:border-border-strong text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={mutationLoading === `${confirmDelete}-delete`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-error hover:bg-error/90 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {mutationLoading === `${confirmDelete}-delete` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
