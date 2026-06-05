export function SkeletonCard() {
  return (
    <div className="bg-surface-2/90 border border-border-subtle rounded-2xl p-6 animate-pulse">
      <div className="h-3.5 bg-surface-3/70 rounded-lg w-1/3 mb-4" />
      <div className="h-8 bg-surface-3/70 rounded-lg w-1/2 mb-2" />
      <div className="h-3 bg-surface-3/50 rounded-lg w-1/4" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-surface-2/90 border border-border-subtle rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

export function SkeletonMetric() {
  return (
    <div className="bg-surface-2/90 border border-border-subtle rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 bg-surface-3/70 rounded-xl" />
        <div className="h-5 bg-surface-3/50 rounded-lg w-12" />
      </div>
      <div className="h-3 bg-surface-3/50 rounded-lg w-1/2 mb-2" />
      <div className="h-8 bg-surface-3/70 rounded-lg w-3/4" />
    </div>
  )
}

export function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-5 py-4">
          <div className="h-4 bg-surface-3/50 rounded-lg animate-pulse" />
        </td>
      ))}
    </tr>
  )
}
