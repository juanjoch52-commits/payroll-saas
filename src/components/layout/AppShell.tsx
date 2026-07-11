import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { SubscriptionBanner } from './SubscriptionBanner'
import { getSubscriptionGate } from '@/lib/auth/subscription'
import { createClient } from '@/lib/supabase/server'
import type { ActiveSession } from '@/lib/auth/session'

/**
 * Layout principal de la app autenticada — sidebar fijo + header + content.
 *
 * Server Component. Pasa la session al sidebar y al header para que ellos
 * decidan qué mostrar según el rol del usuario.
 */
export async function AppShell({
  children,
  session,
  locale,
}: {
  children: React.ReactNode
  session: ActiveSession
  locale: string
}) {
  const gate = await getSubscriptionGate(session.organizationId)

  // Multitenant: orgs "normales" (empresa + empleados) no ven el módulo de
  // subcontratistas; se activa solo (o desde Settings) al empezar a usarlo.
  const supabase = createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('uses_subcontractors')
    .eq('id', session.organizationId)
    .maybeSingle()
  const hiddenHrefs = (org as { uses_subcontractors?: boolean } | null)?.uses_subcontractors
    ? []
    : ['/subcontractors']

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar locale={locale} role={session.role} hiddenHrefs={hiddenHrefs} />
      <div className="flex flex-1 flex-col">
        <AppHeader session={session} locale={locale} hiddenHrefs={hiddenHrefs} />
        <SubscriptionBanner gate={gate} locale={locale} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
