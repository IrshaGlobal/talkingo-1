import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={[
            'w-full px-4 py-2.5 rounded-xl text-sm',
            'bg-surface-3/60 border border-border-medium',
            'text-text-primary placeholder:text-text-tertiary',
            'transition-all duration-150 outline-none',
            'hover:border-border-strong',
            'focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-surface-3/80',
            error ? 'border-error/60 focus:border-error/80 focus:ring-error/20' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {hint && !error && (
          <p className="mt-1.5 text-xs text-text-tertiary">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-error">{error}</p>
        )}
      </div>
    )
  }
)

GlassInput.displayName = 'GlassInput'

/* ── Textarea variant ─────────────────────────────────────────────────────── */
interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          className={[
            'w-full px-4 py-2.5 rounded-xl text-sm resize-none',
            'bg-surface-3/60 border border-border-medium',
            'text-text-primary placeholder:text-text-tertiary',
            'transition-all duration-150 outline-none',
            'hover:border-border-strong',
            'focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-surface-3/80',
            error ? 'border-error/60 focus:border-error/80 focus:ring-error/20' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {hint && !error && (
          <p className="mt-1.5 text-xs text-text-tertiary">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-error">{error}</p>
        )}
      </div>
    )
  }
)

GlassTextarea.displayName = 'GlassTextarea'
