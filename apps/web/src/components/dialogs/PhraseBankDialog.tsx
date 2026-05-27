'use client'

/**
 * Vocabulary view — words the user is actively learning.
 *
 * Shows active words from the LearnerProfile, organized by status:
 * - Solid: words the user has mastered (graduated soon)
 * - Shaky: words seen but not reliable yet
 * - New: just introduced, not yet practiced
 */

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@talkingo/shared/utils'
import { X, Volume2, Sparkles, Filter, GraduationCap, Award } from 'lucide-react'
import type { TargetLanguage } from '@talkingo/shared/types'
import { geminiClient } from '@/lib/api/gemini-client'
import { loadProfileLocal, type LearnerProfile, type ActiveWord } from '@/lib/learning'
import { useAuth } from '@/context/AuthContext'

interface PhraseBankDialogProps {
  isOpen: boolean
  targetLanguage: TargetLanguage
  onClose: () => void
}

type Filter = 'all' | 'solid' | 'shaky' | 'new'

export function PhraseBankDialog({ isOpen, targetLanguage, onClose }: PhraseBankDialogProps) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!isOpen) {
      setVisible(false)
      return
    }
    setTimeout(() => setVisible(true), 30)
    const p = loadProfileLocal(user?.id ?? null, targetLanguage)
    setProfile(p)
  }, [isOpen, targetLanguage, user])

  const words = profile?.activeWords ?? []
  const graduated = profile?.graduatedWords ?? []

  const filtered = useMemo(() => {
    if (filter === 'all') return [...words].reverse()
    return words.filter(w => w.status === filter).reverse()
  }, [words, filter])

  const counts = useMemo(() => ({
    all: words.length,
    solid: words.filter(w => w.status === 'solid').length,
    shaky: words.filter(w => w.status === 'shaky').length,
    new: words.filter(w => w.status === 'new').length,
  }), [words])

  const speak = (word: string) => {
    geminiClient.speak(word, { targetLanguage })
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={cn(
          'relative w-full max-w-md sm:max-w-lg bg-card/95 border border-border/50',
          'sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden',
          'transition-all duration-300',
          visible ? 'translate-y-0' : 'translate-y-8'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Vocabulary</h2>
              <p className="text-[11px] text-muted-foreground">
                {counts.all} active · {graduated.length} mastered
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted/50 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-foreground/70" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="px-5 py-3 border-b border-border/20 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {(['all', 'shaky', 'new', 'solid'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                filter === f
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              )}
            >
              {f === 'all' ? 'All' : f === 'shaky' ? 'Practicing' : f === 'new' ? 'New' : 'Solid'}
              <span className="ml-1.5 opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* Word list */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-3 space-y-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {filter === 'all' ? 'No vocabulary yet' : `No ${filter} words`}
              </p>
              <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                Have a few conversations and your vocabulary will start building here.
              </p>
            </div>
          ) : (
            filtered.map((word) => (
              <WordCard key={word.word} word={word} onSpeak={() => speak(word.word)} />
            ))
          )}

          {/* Graduated section */}
          {graduated.length > 0 && filter === 'all' && (
            <div className="pt-4 mt-4 border-t border-border/20">
              <div className="flex items-center gap-2 mb-2 px-1">
                <GraduationCap className="w-3.5 h-3.5 text-secondary" />
                <p className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Mastered ({graduated.length})
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {graduated.slice(-30).map((w) => (
                  <button
                    key={w}
                    onClick={() => speak(w)}
                    className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium hover:bg-secondary/20 transition-colors"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WordCard({ word, onSpeak }: { word: ActiveWord; onSpeak: () => void }) {
  const statusColor = word.status === 'solid'
    ? 'bg-primary/10 border-primary/25 text-primary'
    : word.status === 'shaky'
    ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
    : 'bg-muted/30 border-border/30 text-muted-foreground'

  const statusLabel = word.status === 'solid' ? 'Solid' : word.status === 'shaky' ? 'Practicing' : 'New'

  return (
    <div className="p-3 rounded-xl bg-card/60 border border-border/30 hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-foreground truncate">{word.word}</h3>
            <span className={cn(
              'px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase flex-shrink-0',
              statusColor
            )}>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{word.meaning}</p>
        </div>
        <button
          onClick={onSpeak}
          className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Play pronunciation"
        >
          <Volume2 className="w-3.5 h-3.5 text-primary" />
        </button>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Met {word.met}×</span>
        {word.usedCorrectly > 0 && (
          <>
            <span>·</span>
            <span className="text-primary/80">Used {word.usedCorrectly}×</span>
          </>
        )}
      </div>
    </div>
  )
}
