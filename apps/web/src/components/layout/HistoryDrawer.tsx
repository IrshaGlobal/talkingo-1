'use client'

/**
 * HistoryDrawer — conversation history as a bottom sheet / right drawer.
 * Reads from the unified chat-sessions storage.
 */

import { useState, useEffect } from 'react'
import { cn } from '@talkingo/shared/utils'
import { X, MessageSquare, Trash2, Clock, ChevronRight, Phone, Headphones, Radio, Volume2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  loadAllSessions,
  deleteSession,
  formatDuration,
  formatSessionDate,
  modeLabel,
  type ChatSession,
  type SessionMode,
} from '@/lib/storage/chat-sessions'

interface HistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
}

function ModeIcon({ mode }: { mode: SessionMode }) {
  switch (mode) {
    case 'manual': return <MessageSquare className="w-3 h-3" />
    case 'handsfree': return <Headphones className="w-3 h-3" />
    case 'callonly': return <Phone className="w-3 h-3" />
    case 'live': return <Radio className="w-3 h-3" />
  }
}

export function HistoryDrawer({ isOpen, onClose }: HistoryDrawerProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selected, setSelected] = useState<ChatSession | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSessions(loadAllSessions(user?.id ?? null))
      setSelected(null)
    }
  }, [isOpen, user?.id])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteSession(user?.id ?? null, id)) {
      setSessions(loadAllSessions(user?.id ?? null))
      if (selected?.id === id) setSelected(null)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="bottom-sheet-overlay animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="settings-drawer animate-slide-right sm:animate-fade-in">
        <div className="sheet-handle sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 flex-shrink-0">
          {selected ? (
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>
          ) : (
            <h2 className="text-base font-bold text-foreground">History</h2>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-muted/50 flex items-center justify-center transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-foreground/70" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
          {!selected ? (
            sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground">Start chatting to build your history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const firstAi = session.messages.find(m => !m.isUser)?.text || 'No messages'
                  const isActive = session.status === 'active'

                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelected(session)}
                      className={cn(
                        'group relative p-3.5 rounded-xl border transition-all cursor-pointer',
                        isActive
                          ? 'bg-primary/5 border-primary/30 hover:border-primary/50'
                          : 'bg-card/50 border-border/30 hover:border-primary/30 hover:bg-card/70'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
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
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase flex-shrink-0">
                              {session.level}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {firstAi}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-error/10 flex items-center justify-center transition-all flex-shrink-0 ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-error" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ModeIcon mode={session.mode} />
                          <span>{modeLabel(session.mode)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(session.durationSeconds)}</span>
                        </div>
                        <span>{formatSessionDate(session.startedAt)}</span>
                        <span>{session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                  <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Duration</p>
                  <p className="text-sm font-bold text-foreground">{formatDuration(selected.durationSeconds)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                  <MessageSquare className="w-4 h-4 text-secondary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Messages</p>
                  <p className="text-sm font-bold text-foreground">{selected.messages.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                  <ModeIcon mode={selected.mode} />
                  <p className="text-[10px] text-muted-foreground">Mode</p>
                  <p className="text-sm font-bold text-foreground">{modeLabel(selected.mode)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground px-1">{formatSessionDate(selected.startedAt)}</p>

              {/* Messages */}
              <div className="space-y-2">
                {selected.messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    'px-3 py-2.5 rounded-xl text-xs leading-relaxed',
                    msg.isUser
                      ? 'bg-primary/8 border border-primary/15 ml-6'
                      : 'bg-card/60 border border-border/25 mr-6'
                  )}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {/* Voice note indicator */}
                    {msg.audio && msg.audio.status === 'ready' && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-secondary/60">
                        <Volume2 className="w-2.5 h-2.5" />
                        <span>Voice note</span>
                      </div>
                    )}
                    {/* Corrections */}
                    {msg.isUser && msg.corrections && msg.corrections.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-primary/10 space-y-1">
                        {msg.corrections.map((c, i) => (
                          <div key={i} className="flex flex-wrap items-baseline gap-x-1 text-[10px]">
                            <span className="text-error/80 line-through">{c.original}</span>
                            <span className="text-primary font-medium">→ {c.corrected}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {selected.messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground italic py-4">
                    No messages in this session
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
