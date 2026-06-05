'use client'

import { motion } from 'framer-motion'
import { cn } from '@talkingo/shared/utils'
import { MessageCircle, GraduationCap, Clock, User } from 'lucide-react'
import type { HomeTab } from './BottomNav'

interface DesktopTopNavProps {
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
  userName?: string
}

const tabs: { id: HomeTab; label: string; icon: typeof MessageCircle; color: string }[] = [
  { id: 'talk', label: 'Talk', icon: MessageCircle, color: 'text-gold' },
  { id: 'learn', label: 'Learn', icon: GraduationCap, color: 'text-sky-400' },
  { id: 'history', label: 'History', icon: Clock, color: 'text-lavender' },
  { id: 'profile', label: 'Profile', icon: User, color: 'text-mint' },
]

export function DesktopTopNav({ activeTab, onTabChange }: DesktopTopNavProps) {
  return (
    <nav
      className={cn(
        'hidden md:flex fixed top-5 left-1/2 -translate-x-1/2 z-50',
        'rounded-[28px] border border-border/40 bg-card/90 backdrop-blur-xl',
        'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.40),0_0_0_1px_rgba(255,215,0,0.04)_inset]'
      )}
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="relative flex items-center px-2 py-2 gap-1">
        {tabs.map(({ id, label, icon: Icon, color }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1',
                'min-w-[72px] px-3 py-2 rounded-2xl transition-all duration-300',
                '[-webkit-tap-highlight-color:transparent] focus:outline-none',
                isActive ? color : 'text-muted-foreground/60 hover:text-muted-foreground'
              )}
            >
              {/* Orbital ring */}
              {isActive && (
                <motion.div
                  layoutId="top-orbit-ring"
                  className="absolute inset-0 rounded-2xl border-2 border-current/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <div className="absolute inset-[-4px] rounded-2xl border border-current/10 animate-orbital-spin" style={{ animationDuration: '8s' }} />
                </motion.div>
              )}
              {/* Constellation dot */}
              {isActive && (
                <motion.span
                  layoutId="top-orbit-dot"
                  className="absolute -top-0.5 w-1 h-1 rounded-full bg-current animate-star-twinkle"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={cn(
                'w-5 h-5 relative z-10 transition-transform duration-300',
                isActive ? 'scale-110 drop-shadow-[0_0_12px_currentColor]' : 'scale-100'
              )} />
              <span className={cn(
                'text-[10px] font-bold relative z-10',
                isActive ? 'opacity-100' : 'opacity-60'
              )}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
