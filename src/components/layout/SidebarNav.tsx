'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS, canSee, type Role } from './nav-config'

/**
 * Navegación agrupada con estado activo. Client component (usePathname).
 * Reutilizada por el sidebar de escritorio (AppSidebar) y el drawer móvil
 * (MobileNav). `onNavigate` permite cerrar el drawer al elegir una entrada.
 */
export function SidebarNav({
  locale,
  role,
  onNavigate,
}: {
  locale: string
  role: Role
  onNavigate?: () => void
}) {
  const t = useTranslations()
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((i) => canSee(i.minRole, role))
        if (items.length === 0) return null
        return (
          <div key={section.titleKey} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t(section.titleKey as 'nav.sections.overview')}
            </p>
            {items.map(({ href, labelKey, icon: Icon }) => {
              const full = `/${locale}${href}`
              const active = pathname === full || pathname.startsWith(`${full}/`)
              return (
                <Link
                  key={href}
                  href={full}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey as 'nav.dashboard')}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}
