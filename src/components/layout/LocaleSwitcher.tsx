'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

/**
 * Botón para cambiar entre EN y ES.
 *
 * Reemplaza el segmento de locale en la URL actual y navega manteniendo
 * el resto del path. El middleware de next-intl reescribe los mensajes.
 */
export function LocaleSwitcher({ locale }: { locale: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function switchTo(target: Locale) {
    // Reemplaza el primer segmento (`/en/...` → `/es/...`).
    const newPath = pathname.replace(/^\/(en|es)/, `/${target}`)
    router.push(newPath)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1">
      <Globe className="ml-1 h-3 w-3 text-muted-foreground" />
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium transition-colors',
            l === locale
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label={localeLabels[l]}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
