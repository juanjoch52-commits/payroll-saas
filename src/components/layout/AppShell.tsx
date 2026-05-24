import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import type { ActiveSession } from '@/lib/auth/session'

/**
 * Layout principal de la app autenticada — sidebar fijo + header + content.
 *
 * Server Component. Pasa la session al sidebar y al header para que ellos
 * decidan qué mostrar según el rol del usuario.
 */
export function AppShell({
  children,
  session,
  locale,
}: {
  children: React.ReactNode
  session: ActiveSession
  locale: string
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar locale={locale} role={session.role} />
      <div className="flex flex-1 flex-col">
        <AppHeader session={session} locale={locale} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
