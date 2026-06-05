'use client'

import { useState, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, MessageCircle, Phone, Headphones, Lock, Target, Send, BookOpen, Radio,
  Coffee, UserPlus, MapPin, ShoppingBag, Utensils, PenLine, ChevronRight, Sun,
} from 'lucide-react'
import { cn } from '@talkingo/shared/utils'
import { isSubscribed } from '@/lib/subscription/use-subscription'
import { useAuth } from '@/context/AuthContext'
import { NumberTicker } from '@/components/ui/number-ticker'
import { Starfield } from '@/components/ui/orbital'
import type {
  LanguageProgress, UserPreferences, TargetLanguage,
} from '@talkingo/shared/types'
import { getLanguageMeta } from '@talkingo/shared/languages'


interface TalkScreenProps {
  preferences: UserPreferences
  progress: LanguageProgress | null
  userName?: string
  userId: string | null
  onStartSession: (scenarioId: string, mode: 'continue' | 'new') => void
  interactionMode: 'manual' | 'handsfree' | 'native' | 'live'
  onInteractionModeChange: (mode: 'manual' | 'handsfree' | 'native' | 'live') => void
  onNavigateToLearn?: () => void
}

/* ─── Gentle entrance ──────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.14, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
}

const EXAMPLE_SCENARIOS = [
  { id: 'cafe', label: 'Order coffee', Icon: Coffee },
  { id: 'greetings', label: 'Meet someone', Icon: UserPlus },
  { id: 'directions', label: 'Ask directions', Icon: MapPin },
  { id: 'shopping', label: 'Go shopping', Icon: ShoppingBag },
  { id: 'restaurant', label: 'At a restaurant', Icon: Utensils },
  { id: 'daily-routine', label: 'Daily routine', Icon: Sun },
] as const

const MODE_OPTIONS = [
  { key: 'manual' as const, label: 'Chat', icon: MessageCircle, desc: 'Type or voice messages' },
  { key: 'handsfree' as const, label: 'Handsfree', icon: Headphones, desc: 'Natural voice conversations' },
  { key: 'native' as const, label: 'Native', icon: Radio, desc: 'Immersive real-time speaking' },
  { key: 'live' as const, label: 'Call', icon: Phone, desc: 'Live voice calls with AI' },
]

export function TalkScreen({
  preferences, progress, userName, userId,
  onStartSession, interactionMode, onInteractionModeChange, onNavigateToLearn,
}: TalkScreenProps) {
  const { user } = useAuth()
  const isPremium = isSubscribed(user?.id)

  const lang = getLanguageMeta(preferences.targetLanguage)
  const minutes = progress?.totalMinutes ?? 0
  const sessions = progress?.totalSessions ?? 0
  const hasStats = sessions > 0 || minutes > 0

  const modeLabels: Record<string, string> = {
    manual: 'Start Chatting',
    handsfree: 'Start Hands-Free',
    native: 'Start Speaking',
    live: 'Start Call',
  }

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Starfield background */}
      <Starfield className="z-0" density={100} />

      <div className="relative z-10 max-w-lg mx-auto w-full px-5 sm:px-8 pt-4 pb-24 flex-1 flex flex-col overflow-hidden gap-3">

        {/* ── Personal header ── */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="flex-shrink-0">
          <p className="font-display text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
            {greetingByTime()}{userName ? `, ${userName}` : ''}
          </p>
          {lang.native && (
            <p className="text-sm text-muted-foreground/80 mt-0.5">
              Ready to speak{' '}
              <span className="font-medium text-primary">{lang.native}</span>
              {hasStats && (
                <>
                  <span className="text-muted-foreground/40 mx-1.5">&middot;</span>
                  <span className="text-muted-foreground/60">{sessions} sessions &middot; {formatShort(minutes)}</span>
                </>
              )}
            </p>
          )}
        </motion.div>

        {/* ── Mode card ── */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="flex-shrink-0">
          <section className="surface-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/8 border border-primary/20 flex items-center justify-center">
                <MessageCircle className="w-3 h-3 text-primary" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Mode</h2>
            </div>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted/60" role="tablist" aria-label="Conversation mode">
              {MODE_OPTIONS.map(({ key, label, icon: Icon, desc }) => (
                <ModeOption
                  key={key}
                  active={interactionMode === key}
                  icon={<Icon className="w-4 h-4" />}
                  label={label}
                  locked={!isPremium && key !== 'manual'}
                  tooltip={key !== 'manual' ? 'Upgrade to unlock' : undefined}
                  onClick={() => onInteractionModeChange(key)}
                />
              ))}
            </div>
          </section>
        </motion.div>

        {/* ── Topics card (flex-1 to fill remaining space) ── */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="flex-1 min-h-0">
          <section className="surface-card p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="w-6 h-6 rounded-lg bg-secondary/8 border border-secondary/20 flex items-center justify-center">
                <Target className="w-3 h-3 text-secondary" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Quick Topics</h2>
            </div>

            {/* 2-column grid — flex-1 to fill space */}
            <div className="grid grid-cols-2 gap-2 flex-1 content-start">
              {EXAMPLE_SCENARIOS.map(({ id, label, Icon }) => (
                <TopicCard
                  key={id}
                  icon={<Icon className="w-4 h-4" />}
                  label={label}
                  onClick={() => onStartSession(id, 'new')}
                />
              ))}
            </div>

            {/* Bottom actions inside card */}
            <div className="space-y-2 mt-2 flex-shrink-0">
              <CustomScenarioInput onStartSession={onStartSession} compact />
              <button
                onClick={onNavigateToLearn}
                className="surface-card w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-card-elevated transition-colors text-xs text-muted-foreground hover:text-foreground group"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary/60" />
                  <span className="font-medium">Explore all scenarios &amp; modules</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </button>
            </div>
          </section>
        </motion.div>

        {/* ── Bottom CTA ── */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="flex-shrink-0">
          <button
            onClick={() => onStartSession('free-talk', 'new')}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm text-center shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow active:scale-[0.98]"
          >
            {modeLabels[interactionMode] ?? 'Start Free Talk'}
          </button>
        </motion.div>

      </div>
    </div>
  )
}

function formatShort(m: number) {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

/* ─── Mode Option ──────────────────────────────────────────────────────── */
function ModeOption({ active, icon, label, locked, tooltip, onClick }: {
  active: boolean
  icon: ReactNode
  label: string
  locked?: boolean
  tooltip?: string
  onClick: () => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = () => {
    if (locked) {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 2500)
    } else {
      onClick()
    }
  }

  return (
    <motion.button
      role="tab"
      aria-selected={active}
      onClick={handleClick}
      onHoverStart={() => locked && setShowTooltip(true)}
      onHoverEnd={() => setShowTooltip(false)}
      whileTap={{ scale: locked ? 1 : 0.95 }}
      className={cn(
        'relative flex flex-col items-center gap-1 py-2.5 rounded-lg border border-border/40 transition-all duration-200',
        active
          ? 'bg-card text-foreground shadow-sm'
          : locked
            ? 'text-muted-foreground/30 border-border/30 cursor-pointer'
            : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-card/40 hover:border-border/60'
      )}
    >
      {active && (
        <motion.div
          layoutId="mode-active"
          className="absolute inset-0 rounded-lg ring-1 ring-primary/20"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="text-[10px] font-semibold relative z-10">{label}</span>
      {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground/30 absolute top-1 right-1" />}

      {showTooltip && locked && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-card border border-border/50 shadow-lg backdrop-blur-md z-50 whitespace-nowrap pointer-events-none"
        >
          <p className="text-[10px] font-medium text-foreground">{tooltip}</p>
        </motion.div>
      )}
    </motion.button>
  )
}

/* ─── Topic Card (grid-friendly) ──────────────────────────────────────── */
function TopicCard({ icon, label, onClick }: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="surface-card flex items-center gap-2 px-3 py-2.5 hover:bg-card hover:border-primary/30 transition-all text-left group"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary/60 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </motion.button>
  )
}

/* ─── Custom scenario input (compact mode for home) ──────────────────── */
function CustomScenarioInput({ onStartSession, compact }: { onStartSession: (id: string, mode: 'new') => void; compact?: boolean }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStart = () => {
    const trimmed = value.trim()
    if (!trimmed) { inputRef.current?.focus(); return }
    const id = `custom-${Date.now()}`
    sessionStorage.setItem('talkingo_custom_scenario', JSON.stringify({ id, prompt: trimmed, createdAt: Date.now() }))
    setValue('')
    onStartSession(id, 'new')
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        'relative flex items-center gap-2 px-3 rounded-xl transition-all duration-200 border border-border/50',
        'bg-card/80 backdrop-blur-sm',
        compact ? 'py-2' : 'py-3 px-4 gap-3',
        focused
          ? 'border-primary/60 shadow-[0_0_16px_-6px_hsl(var(--primary)/0.2)]'
          : 'hover:border-border/80'
      )}
    >
      <PenLine className={cn('relative z-10 text-muted-foreground/70 flex-shrink-0', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleStart() }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Type a custom topic..."
        className={cn('relative z-10 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none min-w-0', compact ? 'text-xs' : 'text-sm')}
      />
      <motion.button
        onClick={handleStart}
        whileTap={{ scale: 0.9 }}
        className={cn(
          'relative z-10 flex-shrink-0 rounded-lg flex items-center justify-center transition-all',
          compact ? 'w-6 h-6' : 'w-7 h-7',
          value.trim()
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
            : 'bg-muted text-muted-foreground/50'
        )}
        aria-label="Start custom session"
        disabled={!value.trim()}
      >
        <Send className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      </motion.button>
    </motion.div>
  )
}

function greetingByTime() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
