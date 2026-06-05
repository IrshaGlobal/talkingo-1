'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sprout, Users, Activity,
  LogOut, Menu, X, Bell, UserCog, LayoutDashboard, CreditCard,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { TalkingoLogo } from '@/components/TalkingoLogo'

const navItems = [
  { href: '/overview',      label: 'Overview',    icon: LayoutDashboard },
  { href: '/seeds',         label: 'Seeds',       icon: Sprout },
  { href: '/learners',      label: 'Learners',    icon: Users },
  { href: '/sessions',      label: 'Sessions',    icon: Activity },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/users',         label: 'Users',       icon: UserCog },
]

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  isActive: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-3/60 border border-transparent',
      ].join(' ')}
    >
      <Icon
        className={[
          'w-4.5 h-4.5 flex-shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-text-tertiary group-hover:text-text-secondary',
        ].join(' ')}
        size={18}
      />
      <span>{label}</span>

      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow-sm" />
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()

  const activeHref = useMemo(() => {
    for (const item of navItems) {
      if (item.href === '/overview' && pathname === '/overview') return item.href
      if (item.href !== '/overview' && pathname.startsWith(item.href)) return item.href
    }
    return null
  }, [pathname])

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface-2/90 backdrop-blur-xl border border-border-subtle rounded-xl text-text-primary shadow-card"
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside className="hidden lg:flex w-64 bg-surface-1/95 backdrop-blur-xl border-r border-border-subtle flex-col h-full">
        <div className="px-5 py-5 border-b border-border-subtle">
          <Link href="/overview" className="flex items-center gap-3 group">
            <TalkingoLogo size="sm" />
            <div>
              <span className="text-base font-bold text-text-primary tracking-tight">Talkingo</span>
              <p className="text-[11px] text-text-tertiary leading-none mt-0.5">Admin Dashboard</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={item.href === activeHref}
            />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border-subtle space-y-1">
          {user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Signed in as</p>
              <p className="text-xs text-text-secondary font-medium truncate mt-0.5">{user.email}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-text-secondary hover:text-error hover:bg-error/8 border border-transparent transition-all duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/98 backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col h-full pt-16">
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={item.href === activeHref}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>

            <div className="px-4 py-4 border-t border-border-subtle space-y-1">
              {user && (
                <div className="px-3 py-2 mb-1">
                  <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Signed in as</p>
                  <p className="text-xs text-text-secondary font-medium truncate mt-0.5">{user.email}</p>
                </div>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-text-secondary hover:text-error hover:bg-error/8 border border-transparent transition-all"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
