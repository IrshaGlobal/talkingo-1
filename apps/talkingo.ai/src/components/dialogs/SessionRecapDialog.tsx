'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface SessionRecapDialogProps {
  isOpen: boolean
  recap: null
  loading: boolean
  onClose: () => void
  onContinue: () => void
}

export function SessionRecapDialog({ isOpen, recap, loading, onClose, onContinue }: SessionRecapDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden p-6 sm:p-8" showCloseButton={false}>
        <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
          <Sparkles className="w-8 h-8 text-primary" />
          <p className="text-sm text-muted-foreground">Session ended.</p>
          <Button onClick={onContinue} className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white font-medium text-sm hover:shadow-lg hover:shadow-primary/25 transition-all">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
