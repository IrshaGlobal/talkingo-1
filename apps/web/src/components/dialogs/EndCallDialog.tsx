'use client'

import { useState, useEffect } from 'react'
import { cn } from '@talkingo/shared/utils'
import { X, Clock, MessageSquare, CheckCircle2, Sparkles, PhoneOff } from 'lucide-react'
import { formatDuration } from '@/lib/storage/chat-sessions'
import type { VocabItem } from '@talkingo/shared/types'

interface EndCallDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (saveTranscript: boolean, confirmedVocab?: VocabItem[]) => void
  messageCount: number
  callDuration: number
  autoSaveEnabled: boolean
  extractedVocab?: VocabItem[]
}

export function EndCallDialog({
  isOpen,
  onClose,
  onConfirm,
  messageCount,
  callDuration,
  autoSaveEnabled,
  extractedVocab = [],
}: EndCallDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmedVocab, setConfirmedVocab] = useState<VocabItem[]>([])

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsConfirming(false)
      setConfirmedVocab(extractedVocab.map(v => ({ ...v })))
    }
  }, [isOpen, extractedVocab])

  const toggleVocabItem = (index: number) => {
    setConfirmedVocab(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    setIsConfirming(true)
    setTimeout(() => {
      // Always save (auto-save handles it), pass true for backward compat
      onConfirm(true, confirmedVocab)
    }, 300)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md mx-4 bg-card/95 border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">End Conversation?</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-foreground/70" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Duration</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatDuration(callDuration)}</p>
            </div>
            
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-secondary" />
                <span className="text-xs font-medium text-muted-foreground">Messages</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{messageCount}</p>
            </div>
          </div>

          {/* Vocab Confirmation */}
          {extractedVocab.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Words to Add to Your Profile</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {extractedVocab.map((vocab, idx) => {
                  const isKept = confirmedVocab.some(v => v.term === vocab.term)
                  return (
                  <div 
                    key={idx}
                    onClick={() => toggleVocabItem(confirmedVocab.findIndex(v => v.term === vocab.term))}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{vocab.term}</p>
                      <p className="text-xs text-muted-foreground">{vocab.gloss}</p>
                    </div>
                    <CheckCircle2 className={cn(
                      "w-5 h-5 transition-all",
                      isKept ? "text-primary opacity-100" : "text-muted-foreground opacity-30"
                    )} />
                  </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Tap a word to remove it from your learning profile.
              </p>
            </div>
          )}

          {/* Auto-save notice */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your conversation is saved automatically to history.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border/30 bg-muted/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted/50 text-foreground font-medium hover:bg-muted/70 transition-colors border border-border/40"
            disabled={isConfirming}
          >
            Continue Chat
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg flex items-center justify-center gap-2',
              isConfirming ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95',
              'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
            )}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Ending...
              </>
            ) : (
              <>
                <PhoneOff className="w-4 h-4" />
                End & Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
