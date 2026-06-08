import { AlertTriangle, LogOut } from 'lucide-react'

import { endImpersonation } from '@/lib/admin/impersonate'
import { getImpersonationDetails } from '@/lib/admin/impersonate-helpers'

/**
 * Banner rojo fijado arriba que aparece SIEMPRE que hay una sesión de
 * impersonation activa. Click en "Exit" llama la server action y devuelve
 * al admin a /admin.
 *
 * Se monta en el layout RAÍZ (`src/app/layout.tsx`) para que sea visible
 * en TODOS los layouts cuando hay impersonation.
 */
export async function ImpersonationBanner() {
  const details = await getImpersonationDetails()
  if (!details) return null

  async function exit() {
    'use server'
    await endImpersonation()
  }

  const durationSec = Math.floor((Date.now() - details.startedAt) / 1000)
  const mins = Math.floor(durationSec / 60)

  return (
    <div className="sticky top-0 z-[1000] flex items-center justify-center gap-3 border-b-2 border-destructive bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-md">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        You&apos;re impersonating{' '}
        <strong>{details.targetEmail}</strong> in{' '}
        <strong>{details.targetOrgName}</strong> · {mins}m
      </span>
      <form action={exit} className="ml-2">
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-md bg-background px-3 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-background/90"
        >
          <LogOut className="h-3 w-3" />
          Exit
        </button>
      </form>
    </div>
  )
}
