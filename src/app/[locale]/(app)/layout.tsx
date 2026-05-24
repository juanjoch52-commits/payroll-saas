import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { AppShell } from '@/components/layout/AppShell'

// Todas las rutas autenticadas son dinámicas: dependen de cookies/sesión.
export const dynamic = 'force-dynamic'

/**
 * Layout para todas las rutas autenticadas.
 *
 * Si no hay sesión, redirige a /login.
 * Si hay sesión, envuelve `children` en el shell con sidebar y header.
 */
export default async function AppLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const session = await requireSession(`/${locale}/login`)

  // Los employees usan el portal mobile (/(employee)/*), no el admin shell.
  if (session.role === 'employee') {
    redirect(`/${locale}/clock`)
  }

  return (
    <AppShell session={session} locale={locale}>
      {children}
    </AppShell>
  )
}
