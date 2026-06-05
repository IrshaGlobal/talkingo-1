'use client'

import { useState, useEffect } from 'react'
import { cn } from '@talkingo/shared/utils'
import {
  MessageSquare, Trash2, Clock, ChevronLeft, AlertCircle, Crown,
  Phone, Headphones, Mic, Radio, Play, Volume2, Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Starfield } from '@/components/ui/orbital'
import { isSubscribed } from '@/lib/subscription/use-subscription'
import { FREE_TIER } from '@/lib/subscription/free-tier'
import { authFetch } from '@/lib/api/auth-fetch'
import {
  loadAllSessions,
  deleteSession,
  formatDuration,
  formatSessionDate,
  modeLabel,
  type ChatSession,
  type SessionMode,
} from '@/lib/storage/chat-sessions'
import { getPersonaById } from '@talkingo/shared/gemini/personas'

function ModeIcon({ mode }: { mode: SessionMode }) {
  switch (mode) {
    case 'manual': return <MessageSquare className="w-3.5 h-3.5" />
    case 'handsfree': return <Headphones className="w-3.5 h-3.5" />
    case 'native': return <Zap className="w-3.5 h-3.5" />
    case 'live': return <Radio className="w-3.5 h-3.5" />
  }
}

interface HistoryScreenProps {
  onLoadConversation?: (session: ChatSession) => void
}

export function HistoryScreen({ onLoadConversation }: HistoryScreenProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selected, setSelected] = useState<ChatSession | null>(null)
  const isPremium = isSubscribed(user?.id)

  useEffect(() => {
    setSessions(loadAllSessions(user?.id ?? null))
  }, [user?.id])

  // Free users only see the most recent N sessions
  const visibleSessions = isPremium
    ? sessions
    : sessions.slice(0, FREE_TIER.MAX_HISTORY_SESSIONS)
  const hiddenCount = isPremium ? 0 : Math.max(0, sessions.length - FREE_TIER.MAX_HISTORY_SESSIONS)

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteSession(user?.id ?? null, id)) {
      setSessions(loadAllSessions(user?.id ?? null))
      if (selected?.id === id) setSelected(null)
    }
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-24">
      <Starfield className="z-0" density={100} />
      <div className="relative z-10 max-w-md mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        {selected ? (
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to history
          </button>
        ) : (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-star-twinkle" />
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                History
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-star-twinkle" style={{ animationDelay: '0.5s' }} />
            </div>
            <p className="text-sm text-muted-foreground">
              Your conversations are saved automatically
            </p>
          </div>
        )}

        {/* List view */}
        {!selected ? (
          sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/15 rounded-full blur-md" />
                <div className="relative w-20 h-20 rounded-full bg-card/80 border border-primary/15 flex items-center justify-center animate-nebula-pulse">
                  <MessageSquare className="w-8 h-8 text-primary/40" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Start chatting to build your history
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleSessions.map((session) => {
                const persona = getPersonaById(session.personaId)
                const firstAiMessage = session.messages.find(m => !m.isUser)?.text || 'No messages'
                const isActive = session.status === 'active'

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelected(session)}
                    className={cn(
                      'group relative p-4 rounded-xl border transition-all cursor-pointer overflow-hidden shadow-sm backdrop-blur-sm',
                      isActive
                        ? 'bg-primary/5 border-primary/30 hover:border-primary/50'
                        : 'bg-card/80 border-border/40 hover:border-primary/25 hover:bg-card-elevated'
                    )}
                  >
                    {/* Sheen line */}
                    <div className="absolute top-0 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {session.title}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold uppercase flex-shrink-0 animate-pulse">
                              Live
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-full bg-primary/8 text-primary text-[9px] font-bold uppercase flex-shrink-0">
                            {session.level}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {firstAiMessage}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(session.id, e)}
                        className="opacity-60 group-hover:opacity-100 hover:bg-error/10 w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ml-2"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-error" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1" title={modeLabel(session.mode)}>
                        <ModeIcon mode={session.mode} />
                        <span>{modeLabel(session.mode)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(session.durationSeconds)}</span>
                      </div>
                      <span>{formatSessionDate(session.startedAt)}</span>
                      <span>{session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}</span>
                      {session.totalCorrections > 0 && (
                        <span className="text-error/70">
                          {session.totalCorrections} correction{session.totalCorrections === 1 ? '' : 's'}
                        </span>
                      )}
                      {persona && (
                        <span className="text-primary/60 capitalize">{persona.name}</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Upgrade card for free users with more history */}
              {hiddenCount > 0 && (
                <div className="relative p-5 rounded-2xl border border-primary/20 text-center space-y-2 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 pointer-events-none" />
                  <div className="relative">
                    <div className="relative w-10 h-10 mx-auto mb-2">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-accent/20 rounded-xl blur-sm" />
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {hiddenCount} more session{hiddenCount === 1 ? '' : 's'} hidden
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Upgrade to Premium to see your full conversation history
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const res = await authFetch('/api/stripe/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plan: 'yearly', email: user?.email, userId: user?.id }),
                          })
                          const { url } = await res.json()
                          if (url) window.location.href = url
                        } catch {}
                      }}
                      className="relative mt-3 px-5 py-2.5 rounded-full text-xs font-bold tracking-tight overflow-hidden group inline-flex"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative text-primary-foreground flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" />
                        Unlock Full History
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Detail view */
          <div className="space-y-4">
            {/* Session info header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ModeIcon mode={selected.mode} />
              <span>{modeLabel(selected.mode)}</span>
              <span>·</span>
              <span className="capitalize">{selected.personaId}</span>
              <span>·</span>
              <span>{formatSessionDate(selected.startedAt)}</span>
              {selected.status === 'active' && (
                <>
                  <span>·</span>
                  <span className="text-primary font-medium animate-pulse">In progress</span>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-4 rounded-xl bg-card/80 border border-border/40 text-center shadow-sm backdrop-blur-sm">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-[10px] text-muted-foreground">Duration</p>
                <p className="text-sm font-bold text-foreground">{formatDuration(selected.durationSeconds)}</p>
              </div>
              <div className="p-4 rounded-xl bg-card/80 border border-border/40 text-center shadow-sm backdrop-blur-sm">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-secondary" />
                </div>
                <p className="text-[10px] text-muted-foreground">Messages</p>
                <p className="text-sm font-bold text-foreground">{selected.messages.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-card/80 border border-border/40 text-center shadow-sm backdrop-blur-sm">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-error/70" />
                </div>
                <p className="text-[10px] text-muted-foreground">Corrections</p>
                <p className="text-sm font-bold text-foreground">{selected.totalCorrections}</p>
              </div>
            </div>

            {/* Continue button */}
            {onLoadConversation && (
              <button
                onClick={() => {
                  onLoadConversation(selected)
                }}
                className="relative w-full py-3.5 rounded-2xl text-sm font-bold tracking-tight overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative text-primary-foreground flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  Continue conversation
                </span>
              </button>
            )}

            {/* Messages */}
            <div className="space-y-2">
              {selected.messages.map((msg) => (
                <div key={msg.id} className={cn(
                  'relative px-4 py-3 rounded-2xl text-sm leading-relaxed overflow-hidden',
                  msg.isUser
                    ? 'bg-primary/6 border border-primary/12 ml-8'
                    : 'bg-card border border-border/20 mr-8'
                )}>
                  {/* Sheen line */}
                  <div className="absolute top-0 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none" />
                  <p className="relative z-10 whitespace-pre-wrap">{msg.text}</p>

                  {/* Translation */}
                  {msg.translation && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground/70 italic">
                      {msg.translation}
                    </p>
                  )}

                  {/* Voice note indicator */}
                  {msg.audio && msg.audio.status === 'ready' && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-secondary/70">
                      <Volume2 className="w-3 h-3" />
                      <span>Voice note attached</span>
                    </div>
                  )}

                  {/* Corrections inline — shown under user messages */}
                  {msg.isUser && msg.corrections && msg.corrections.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-primary/10 space-y-1.5 overflow-hidden">
                      {msg.corrections.map((c, i) => (
                        <div key={i} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px]">
                          <span className="text-error/80 line-through">{c.original}</span>
                          <span className="text-primary font-medium">→ {c.corrected}</span>
                          {c.note && (
                            <span className="text-muted-foreground/50 italic text-[10px] w-full truncate">{c.note}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vocab items on AI messages */}
                  {!msg.isUser && msg.vocab && msg.vocab.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/20 flex flex-wrap gap-1.5">
                      {msg.vocab.map((v, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-medium">
                          {v.term} — {v.gloss}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {selected.messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground italic py-8">
                  No messages in this session
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
