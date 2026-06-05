import { ReactNode } from 'react'

type ColorKey = 'cyan' | 'violet' | 'emerald' | 'sky' | 'amber' | 'rose'

interface MetricCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: string
  sub?: string
  color?: ColorKey
}

const colorMap: Record<ColorKey, { icon: string; glow: string; trend: string }> = {
  cyan:    { icon: 'bg-primary/10 text-primary',    glow: 'from-primary/20 to-primary/5',    trend: 'text-primary' },
  violet:  { icon: 'bg-accent/10 text-accent',      glow: 'from-accent/20 to-accent/5',      trend: 'text-accent' },
  emerald: { icon: 'bg-success/10 text-success',    glow: 'from-success/20 to-success/5',    trend: 'text-success' },
  sky:     { icon: 'bg-info/10 text-info',          glow: 'from-info/20 to-info/5',          trend: 'text-info' },
  amber:   { icon: 'bg-warning/10 text-warning',    glow: 'from-warning/20 to-warning/5',    trend: 'text-warning' },
  rose:    { icon: 'bg-error/10 text-error',        glow: 'from-error/20 to-error/5',        trend: 'text-error' },
}

export function MetricCard({
  icon,
  label,
  value,
  trend,
  sub,
  color = 'cyan',
}: MetricCardProps) {
  const c = colorMap[color]

  return (
    <div className="relative group">
      {/* Hover glow */}
      <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${c.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none`} />

      {/* Card */}
      <div className="relative bg-surface-2/90 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 shadow-card group-hover:shadow-card-hover transition-shadow duration-300">
        {/* Top shimmer */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.icon}`}>
              {icon}
            </div>

            {trend && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                trend.startsWith('+')
                  ? 'bg-success/10 text-success'
                  : 'bg-error/10 text-error'
              }`}>
                {trend}
              </span>
            )}
          </div>

          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-text-primary tracking-tight">{value}</p>
          {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
