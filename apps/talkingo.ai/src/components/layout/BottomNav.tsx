'use client'

import { motion } from 'framer-motion'
import { cn } from '@talkingo/shared/utils'
import { MessageCircle, GraduationCap, Clock, User } from 'lucide-react'

export type HomeTab = 'talk' | 'learn' | 'history' | 'profile'

interface BottomNavProps {
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
}

const tabs: { id: HomeTab; label: string; icon: typeof MessageCircle }[] = [
  { id: 'talk', label: 'Talk', icon: MessageCircle },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'profile', label: 'Profile', icon: User },
]

const orbitColors: Record<HomeTab, string> = {
  talk: 'text-gold',
  learn: 'text-sky-400',
  history: 'text-lavender',
  profile: 'text-mint',
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40',
        'rounded-[28px] border border-border/40 bg-card/90',
        'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,215,0,0.04)_inset]',
        'safe-area-bottom backdrop-blur-xl'
      )}
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="relative flex items-center px-2 py-2 gap-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1',
                'w-16 px-2 py-2 rounded-2xl transition-all duration-300',
                '[-webkit-tap-highlight-color:transparent] focus:outline-none',
                isActive ? orbitColors[id] : 'text-muted-foreground/50 hover:text-muted-foreground'
              )}
            >
              {/* Orbital ring around active */}
              {isActive && (
                <motion.div
                  layoutId="orbit-ring"
                  className="absolute inset-0 rounded-2xl border-2 border-current/20"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <div className="absolute inset-[-4px] rounded-2xl border border-current/10 animate-orbital-spin" style={{ animationDuration: '8s' }} />
                </motion.div>
              )}
              {/* Glow dot for active */}
              {isActive && (
                <motion.span
                  layoutId="orbit-dot"
                  className="absolute -top-0.5 w-1 h-1 rounded-full bg-current animate-star-twinkle"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={cn(
                'w-5 h-5 relative z-10 transition-transform duration-300',
                isActive ? 'scale-110 drop-shadow-[0_0_12px_currentColor]' : 'scale-100'
              )} />
              <span className={cn(
                'text-[9px] font-bold relative z-10 transition-all',
                isActive ? 'opacity-100' : 'opacity-60'
              )}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
