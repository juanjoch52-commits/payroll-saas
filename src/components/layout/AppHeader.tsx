import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LocaleSwitcher } from './LocaleSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { OrgSwitcher } from './OrgSwitcher'
import { MobileNav } from './MobileNav'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import type { ActiveSession } from '@/lib/auth/session'

export async function AppHeader({
  session,
  locale,
  hiddenHrefs,
}: {
  session: ActiveSession
  locale: string
  hiddenHrefs?: string[]
}) {
  const t = await getTranslations()
  const supabase = createClient()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('organization_id, organizations:organization_id (name)')
    .eq('user_id', session.userId)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-3">
        <MobileNav locale={locale} role={session.role} hiddenHrefs={hiddenHrefs} />
        <span className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:inline">
          {t('common.appName')}
        </span>
        <OrgSwitcher
          currentOrgId={session.organizationId}
          currentOrgName={session.organizationName}
          memberships={(memberships ?? []) as never}
        />
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell userId={session.userId} locale={locale} />
        <LocaleSwitcher locale={locale} />
        <ThemeToggle />
        <UserMenu session={session} locale={locale} />
      </div>
    </header>
  )
}
