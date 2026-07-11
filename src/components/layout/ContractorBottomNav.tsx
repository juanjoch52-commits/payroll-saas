'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Users, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Bottom-nav del portal del contratista (2 secciones). */
const ITEMS = [
  { href: '/my-crew', labelKey: 'contractor.navCrew', icon: Users },
  { href: '/my-settlements', labelKey: 'contractor.navSettlements', icon: Receipt },
] as const

export function ContractorBottomNav({ locale }: { locale: string }) {
  const t = useTranslations()
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-2 border-t bg-card">
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
            <span>{t(labelKey as 'contractor.navCrew')}</span>
          </Link>
        )
      })}
    </nav>
  )
}
