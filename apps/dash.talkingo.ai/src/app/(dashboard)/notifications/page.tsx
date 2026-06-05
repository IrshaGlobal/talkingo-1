'use client'

import { useState, useEffect } from 'react'
import {
  Bell, Send, Trash2, RefreshCw, AlertTriangle, CheckCircle,
  Megaphone, Lightbulb, Trophy, AlertOctagon, Zap, Users, User,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { adminFetch } from '@/lib/admin-fetch'

interface NotificationDoc {
  $id: string
  userId: string
  type: 'announcement' | 'achievement' | 'tip' | 'warning' | 'update'
  title: string
  message: string
  read: boolean
  createdAt: number
  createdBy: string
  targetAll: boolean
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  announcement: { label: 'Announcement', icon: <Megaphone className="w-4 h-4" />, color: 'text-info',    bg: 'bg-info/10 border-info/20' },
  achievement:  { label: 'Achievement',  icon: <Trophy className="w-4 h-4" />,    color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  tip:          { label: 'Tip',          icon: <Lightbulb className="w-4 h-4" />, color: 'text-success', bg: 'bg-success/10 border-success/20' },
  warning:      { label: 'Warning',      icon: <AlertOctagon className="w-4 h-4" />, color: 'text-error', bg: 'bg-error/10 border-error/20' },
  update:       { label: 'Update',       icon: <Zap className="w-4 h-4" />,       color: 'text-accent',  bg: 'bg-accent/10 border-accent/20' },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'Just now'
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Compose form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationDoc['type']>('announcement')
  const [targetAll, setTargetAll] = useState(true)
  const [targetUserId, setTargetUserId] = useState('')
  const [link, setLink] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to load notifications')
      const json = await res.json()
      setNotifications(json.notifications ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setSendSuccess(false)
    setError(null)
    try {
      const res = await adminFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          targetAll,
          userId: targetAll ? 'all' : targetUserId.trim(),
          createdBy: user?.email ?? 'admin',
          link: link.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to send notification')
      }
      setTitle('')
      setMessage('')
      setType('announcement')
      setTargetAll(true)
      setTargetUserId('')
      setLink('')
      setImageUrl('')
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 3000)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteId(id)
    try {
      const res = await adminFetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setNotifications(prev => prev.filter(n => n.$id !== id))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Notifications</h1>
          <p className="text-sm text-text-secondary mt-1">Send announcements and messages to your learners</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose Panel */}
        <div className="lg:col-span-2">
          <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl p-5 sticky top-6 shadow-card">
            <h2 className="text-sm font-semibold text-text-primary mb-5 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Compose Notification
            </h2>

            <form onSubmit={handleSend} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setType(key as NotificationDoc['type'])}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        type === key
                          ? `${meta.bg} ${meta.color} border-current`
                          : 'bg-surface-3/40 border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-3/70'
                      }`}
                    >
                      {meta.icon}
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Target</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetAll(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      targetAll
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface-3/40 border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-3/70'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    All Users
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetAll(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      !targetAll
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface-3/40 border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-3/70'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Specific User
                  </button>
                </div>
                {!targetAll && (
                  <input
                    type="text"
                    placeholder="User ID (from Appwrite)"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="mt-2 w-full px-3 py-2 bg-surface-3/60 border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                    required={!targetAll}
                  />
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full px-3 py-2 bg-surface-3/60 border border-border-medium rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Message</label>
                <textarea
                  placeholder="Write your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-3/60 border border-border-medium rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none resize-none transition-all"
                />
                <p className="text-xs text-text-tertiary mt-1 text-right">{message.length}/500</p>
              </div>

              {/* Optional Link */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/details"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-3/60 border border-border-medium rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                />
                <p className="text-xs text-text-tertiary mt-1">Add a URL users can click to learn more</p>
              </div>

              {/* Optional Image */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-3/60 border border-border-medium rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                />
                <p className="text-xs text-text-tertiary mt-1">Image will appear above the message (max height: 96px)</p>
              </div>

              {/* Preview */}
              {(title || message) && (
                <div className={`p-3 rounded-xl border ${TYPE_META[type].bg}`}>
                  <p className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${TYPE_META[type].color}`}>
                    {TYPE_META[type].icon}
                    {title || 'Preview title'}
                  </p>
                  <p className="text-xs text-text-secondary">{message || 'Preview message...'}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-primary-dim hover:brightness-110 text-background rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-sm"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : sendSuccess ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sending ? 'Sending...' : sendSuccess ? 'Sent!' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>

        {/* Notifications List */}
        <div className="lg:col-span-3">
          <div className="bg-surface-2/90 backdrop-blur border border-border-subtle rounded-2xl overflow-hidden shadow-card">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Sent Notifications
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                  {notifications.length}
                </span>
              </h2>
            </div>

            {loading && notifications.length === 0 ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-surface-3/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="w-12 h-12 text-text-tertiary mb-3" />
                <p className="text-text-secondary font-medium">No notifications sent yet</p>
                <p className="text-text-tertiary text-sm mt-1">Use the form to send your first notification</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {notifications.map((n) => {
                  const meta = TYPE_META[n.type] ?? TYPE_META.announcement
                  return (
                    <div key={n.$id} className="p-5 hover:bg-surface-3/20 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color}`}>
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-text-primary">{n.title}</span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${meta.bg} ${meta.color}`}>
                                {meta.label}
                              </span>
                              {n.targetAll ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-3/50 text-text-secondary border border-border-subtle">
                                  <Users className="w-2.5 h-2.5" /> All users
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-3/50 text-text-secondary border border-border-subtle">
                                  <User className="w-2.5 h-2.5" /> {n.userId.slice(0, 8)}…
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary leading-relaxed">{n.message}</p>
                            <p className="text-xs text-text-tertiary mt-2">
                              Sent by {n.createdBy} · {timeAgo(n.createdAt)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(n.$id)}
                          disabled={deleteId === n.$id}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-error hover:bg-error/10 transition-all flex-shrink-0"
                          title="Delete notification"
                        >
                          {deleteId === n.$id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
