'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Clock, History, Receipt, User, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Bottom-nav del portal del empleado con estado activo (client, usePathname).
 */
const ITEMS = [
  { href: '/clock', labelKey: 'nav.clock', icon: Clock },
  { href: '/my-schedule', labelKey: 'nav.schedule', icon: CalendarDays },
  { href: '/history', labelKey: 'nav.history', icon: History },
  { href: '/paystubs', labelKey: 'nav.paystubs', icon: Receipt },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
] as const

export function EmployeeBottomNav({ locale }: { locale: string }) {
  const t = useTranslations()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-card">
      {ITEMS.map(({ href, labelKey, icon: Icon }) => {
        const full = `/${locale}${href}`
        const active = pathname === full || pathname.startsWith(`${full}/`)
        return (
          <Link
            key={href}
            href={full}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{t(labelKey as 'nav.clock')}</span>
          </Link>
        )
      })}
    </nav>
  )
}
