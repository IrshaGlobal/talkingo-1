'use client'

import { Sparkles } from 'lucide-react'
import type { TargetLanguage } from '@talkingo/shared/types'
import { geminiClient } from '@/lib/api/gemini-client'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface PhraseBankDialogProps {
  isOpen: boolean
  targetLanguage: TargetLanguage
  onClose: () => void
}

export function PhraseBankDialog({ isOpen, targetLanguage, onClose }: PhraseBankDialogProps) {
  const speak = (word: string) => {
    geminiClient.speak(word, { targetLanguage })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="bottom" showCloseButton={false} className="h-[85vh] sm:h-[80vh] sm:max-w-lg sm:mx-auto sm:rounded-t-3xl p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Recent Vocabulary</h2>
              <p className="text-[11px] text-muted-foreground">
                Words you learn appear in chat history
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-xl">
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Vocabulary at a glance</p>
            <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
              Check your chat history to review words you learned in each session.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
