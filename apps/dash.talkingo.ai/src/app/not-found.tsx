import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-6xl font-extrabold text-text-primary/10 mb-2">404</h1>
      <h2 className="text-xl font-bold text-text-primary mb-2">Page not found</h2>
      <p className="text-sm text-text-tertiary mb-6 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/overview"
        className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-primary-dim text-background shadow-glow-sm hover:shadow-glow-primary hover:brightness-110 transition-all duration-200"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
