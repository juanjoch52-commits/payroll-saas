import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireSession } from '@/lib/auth/session'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { EmployeeBottomNav } from '@/components/layout/EmployeeBottomNav'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { signOut } from '@/app/actions/auth'

// Portal del empleado. Forzamos dinámico (depende de sesión).
export const dynamic = 'force-dynamic'

/**
 * Layout mobile-first del portal del empleado.
 *
 * 4 secciones en bottom-nav: Clock, History, Pay stubs, Profile.
 * Owner/admin/manager NO usan este layout — son redirigidos a (app).
 */
export default async function EmployeeLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const session = await requireSession(`/${locale}/login`)
  const t = await getTranslations()

  // Si NO es employee, redirigir al admin
  if (session.role !== 'employee') {
    redirect(`/${locale}/dashboard`)
  }

  async function handleSignOut() {
    'use server'
    await signOut(locale)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <Link href={`/${locale}/clock`} className="flex flex-col text-left">
          <JovaWordmark size="sm" />
          <p className="text-sm font-medium text-muted-foreground">{session.organizationName}</p>
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher locale={locale} />
          <ThemeToggle />
          <form action={handleSignOut}>
            <button type="submit" className="text-xs text-muted-foreground hover:text-foreground">
              {t('nav.signOut')}
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom nav (mobile-first) con estado activo */}
      <EmployeeBottomNav locale={locale} />
    </div>
  )
}
