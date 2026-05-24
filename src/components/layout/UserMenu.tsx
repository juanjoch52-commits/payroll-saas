'use client'

import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import type { ActiveSession } from '@/lib/auth/session'

/**
 * Botón con el correo del user activo y opción para cerrar sesión.
 * En Fase 4+ se puede expandir a un dropdown con perfil, switcher de org, etc.
 */
export function UserMenu({ session, locale }: { session: ActiveSession; locale: string }) {
  const t = useTranslations()

  async function handleSignOut() {
    await signOut(locale)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-xs">
        <p className="font-medium leading-tight">{session.email}</p>
        <p className="leading-tight text-muted-foreground">{session.role}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label={t('nav.signOut')}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
