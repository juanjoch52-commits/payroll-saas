import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { requireSession } from '@/lib/auth/session'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ContractorBottomNav } from '@/components/layout/ContractorBottomNav'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { signOut } from '@/app/actions/auth'

// Portal del contratista. Forzamos dinámico (depende de sesión).
export const dynamic = 'force-dynamic'

/**
 * Layout mobile-first del portal del contratista: ve SU equipo (subtree),
 * SUS tarifas/márgenes y SUS liquidaciones. Nada del resto de la org.
 */
export default async function ContractorLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const session = await requireSession(`/${locale}/login`)
  const t = await getTranslations()

  if (session.role !== 'contractor') {
    redirect(session.role === 'employee' ? `/${locale}/clock` : `/${locale}/dashboard`)
  }

  async function handleSignOut() {
    'use server'
    await signOut(locale)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <Link href={`/${locale}/my-crew`} className="flex flex-col text-left">
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

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <ContractorBottomNav locale={locale} />
    </div>
  )
}
