'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { SidebarNav } from './SidebarNav'
import type { Role } from './nav-config'

/**
 * Navegación móvil: botón hamburguesa + drawer deslizante. Antes el app de
 * manager NO tenía navegación en pantallas < md (el sidebar es hidden md:flex).
 * Solo se muestra en móvil (md:hidden).
 */
export function MobileNav({
  locale,
  role,
  hiddenHrefs,
}: {
  locale: string
  role: Role
  hiddenHrefs?: string[]
}) {
  const [open, setOpen] = useState(false)

  // Bloquea el scroll del body mientras el drawer está abierto.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col border-r bg-card shadow-xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
              <JovaWordmark size="md" />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav locale={locale} role={role} hiddenHrefs={hiddenHrefs} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
