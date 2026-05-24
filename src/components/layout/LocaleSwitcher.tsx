'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import {
  locales,
  localeLabels,
  localeFlags,
  localeShort,
  type Locale,
} from '@/i18n/config'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Selector de idioma con 4 locales. Dropdown con bandera + nombre nativo.
 * Reemplaza el segmento de locale en la URL (`/en/...` → `/fr-CA/...`).
 */
export function LocaleSwitcher({ locale }: { locale: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const current = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : 'en'

  function switchTo(target: Locale) {
    // Reemplaza el primer segmento (`/en/...` → `/fr-CA/...`).
    const newPath = pathname.replace(/^\/(en|es|fr|fr-CA)(?=\/|$)/, `/${target}`)
    router.push(newPath)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label={localeLabels[current]}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden text-xs font-medium sm:inline">
            {localeShort[current]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => switchTo(l)}
            className={l === current ? 'bg-accent font-medium' : ''}
          >
            <span className="mr-2">{localeFlags[l]}</span>
            {localeLabels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
