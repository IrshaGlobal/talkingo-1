'use client'

import { useState, useEffect } from 'react'
import { cn } from '@talkingo/shared/utils'
import { Clock, MessageSquare, CheckCircle2, Sparkles, PhoneOff } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
      onConfirm(true, confirmedVocab)
    }, 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md p-0 gap-0" showCloseButton={false}>
        <div className="px-6 py-5 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">End Conversation?</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-lg">
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
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

          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your conversation is saved automatically to history.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/30 bg-muted/20 flex gap-3 rounded-b-xl">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1"
          >
            Continue Chat
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className={cn(
              'flex-1 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20',
              isConfirming && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isConfirming ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Ending...
              </>
            ) : (
              <>
                <PhoneOff className="w-4 h-4 mr-2" />
                End & Review
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
