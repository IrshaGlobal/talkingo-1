'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@talkingo/shared/utils'

/* ─── Starfield Background Canvas ─────────────────────────────────────────── */
export function Starfield({ className, density = 120 }: { className?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)

    const stars: { x: number; y: number; r: number; alpha: number; speed: number }[] = []
    for (let i = 0; i < density; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.2,
        alpha: Math.random(),
        speed: Math.random() * 0.003 + 0.001,
      })
    }

    let anim: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach((star) => {
        star.alpha += star.speed
        const opacity = 0.3 + Math.abs(Math.sin(star.alpha)) * 0.7
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`
        ctx.fill()
      })
      anim = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(anim)
      window.removeEventListener('resize', resize)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      aria-hidden="true"
    />
  )
}

/* ─── Central Sun (Primary CTA) ─────────────────────────────────────────── */
export function SunButton({
  children,
  className,
  onClick,
  glowColor = 'hsl(var(--primary))',
  size = 'md',
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  glowColor?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass = { sm: 'w-20 h-20', md: 'w-28 h-28', lg: 'w-36 h-36' }
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'relative rounded-full flex items-center justify-center',
        'bg-gradient-to-br from-primary via-primary-glow to-accent',
        'shadow-[0_0_40px_-8px_hsl(var(--primary)/0.4)]',
        'border border-white/10',
        sizeClass[size],
        className
      )}
      style={{ boxShadow: `0 0 60px -10px ${glowColor}40, 0 0 120px -30px ${glowColor}20 inset` }}
    >
      {/* Orbital rings */}
      <div className="absolute inset-[-12px] rounded-full border border-primary/10 animate-orbital-spin" style={{ animationDuration: '12s' }} />
      <div className="absolute inset-[-24px] rounded-full border border-primary/5 animate-orbital-spin" style={{ animationDuration: '18s', animationDirection: 'reverse' }} />
      {/* Inner core */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
      <span className="relative z-10 text-primary-foreground font-bold text-sm text-center leading-tight">
        {children}
      </span>
    </motion.button>
  )
}

/* ─── Orbiting Planet (Mode / Action Button) ────────────────────────────── */
export function PlanetButton({
  active,
  onClick,
  icon,
  label,
  locked,
  orbitIndex = 0,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  locked?: boolean
  orbitIndex?: number
}) {
  const colors = [
    'border-sky-400/40 bg-sky-400/10 text-sky-300',
    'border-lavender/40 bg-lavender/10 text-lavender',
    'border-gold/40 bg-gold/10 text-gold',
    'border-mint/40 bg-mint/10 text-mint',
  ]
  const activeColor = colors[orbitIndex % colors.length]

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={cn(
        'relative flex flex-col items-center gap-1 transition-all duration-300',
        active
          ? cn('px-4 py-2.5 rounded-2xl border shadow-lg', activeColor, 'shadow-current/10')
          : 'px-4 py-2.5 rounded-2xl border border-border/30 bg-card/50 text-muted-foreground hover:border-border/60 hover:bg-card'
      )}
    >
      {active && (
        <motion.div
          layoutId="planet-ring"
          className="absolute inset-0 rounded-2xl border-2 border-current/20"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className={cn('relative z-10', active ? 'text-current' : '')}>{icon}</span>
      <span className="text-[10px] font-bold relative z-10">{label}</span>
      {locked && <span className="text-[8px] opacity-40">🔒</span>}
    </motion.button>
  )
}

/* ─── Satellite Stat Badge ───────────────────────────────────────────────── */
export function Satellite({
  icon,
  value,
  unit,
  className,
}: {
  icon: React.ReactNode
  value: React.ReactNode
  unit: string
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-card border border-border/30',
        'shadow-sm backdrop-blur-none',
        className
      )}
    >
      {icon}
      <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium">{unit}</span>
    </motion.div>
  )
}

/* ─── Constellation Connector (SVG line between elements) ────────────────── */
export function ConstellationLine({
  fromRef,
  toRef,
  className,
}: {
  fromRef: React.RefObject<HTMLElement | null>
  toRef: React.RefObject<HTMLElement | null>
  className?: string
}) {
  const [d, setD] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const update = () => {
      const f = fromRef.current
      const t = toRef.current
      const svg = svgRef.current
      if (!f || !t || !svg) return
      const svgRect = svg.getBoundingClientRect()
      const fRect = f.getBoundingClientRect()
      const tRect = t.getBoundingClientRect()
      const x1 = fRect.left + fRect.width / 2 - svgRect.left
      const y1 = fRect.top + fRect.height / 2 - svgRect.top
      const x2 = tRect.left + tRect.width / 2 - svgRect.left
      const y2 = tRect.top + tRect.height / 2 - svgRect.top
      const midX = (x1 + x2) / 2
      const midY = Math.min(y1, y2) - 20
      setD(`M${x1},${y1} Q${midX},${midY} ${x2},${y2}`)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [fromRef, toRef])

  return (
    <svg
      ref={svgRef}
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      style={{ zIndex: 0 }}
    >
      <path
        d={d}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.25"
      />
    </svg>
  )
}

/* ─── Orbital Ring (decorative concentric circle) ──────────────────────── */
export function OrbitalRing({
  children,
  className,
  size = 280,
  duration = 20,
  reverse = false,
}: {
  children?: React.ReactNode
  className?: string
  size?: number
  duration?: number
  reverse?: boolean
}) {
  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full border border-primary/10"
        style={{
          animation: `orbital-spin ${duration}s linear infinite ${reverse ? 'reverse' : ''}`,
        }}
      />
      {children}
    </div>
  )
}

/* ─── Star Node (small pulsing dot indicator) ────────────────────────────── */
export function StarNode({ active, className }: { active?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-1.5 h-1.5 rounded-full',
        active ? 'bg-primary animate-star-twinkle' : 'bg-muted-foreground/30',
        className
      )}
    />
  )
}
