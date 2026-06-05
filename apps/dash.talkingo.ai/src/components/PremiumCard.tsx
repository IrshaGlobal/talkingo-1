import { ReactNode } from 'react'

interface PremiumCardProps {
  children: ReactNode
  className?: string
  /** Show a subtle hover glow on the card */
  hover?: boolean
  /** Render a persistent primary-tinted border */
  highlight?: boolean
  /** Extra padding variant */
  compact?: boolean
}

export function PremiumCard({
  children,
  className = '',
  hover = true,
  highlight = false,
  compact = false,
}: PremiumCardProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Ambient glow — only visible on hover */}
      {hover && (
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
      )}

      {/* Card surface */}
      <div
        className={[
          'relative rounded-2xl shadow-card group-hover:shadow-card-hover transition-shadow duration-300',
          'bg-surface-2/90 backdrop-blur-xl',
          highlight
            ? 'border border-primary/30'
            : 'border border-border-subtle',
          compact ? 'p-4' : 'p-6',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Inner top-edge shimmer */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}
