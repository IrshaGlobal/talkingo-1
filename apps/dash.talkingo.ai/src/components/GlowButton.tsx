import { ReactNode, ButtonHTMLAttributes } from 'react'

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: GlowButtonProps) {
  const base =
    'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  const sizes = {
    sm: 'px-3.5 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2',
  }

  const variants = {
    primary:
      'bg-gradient-to-r from-primary to-primary-dim text-background shadow-glow-sm hover:shadow-glow-primary hover:brightness-110 active:brightness-95',
    secondary:
      'bg-surface-3 hover:bg-surface-4 text-text-primary border border-border-medium hover:border-border-strong',
    outline:
      'bg-transparent hover:bg-surface-3 text-text-primary border border-border-medium hover:border-border-strong',
    danger:
      'bg-error/10 hover:bg-error/20 text-error border border-error/30 hover:border-error/50',
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
