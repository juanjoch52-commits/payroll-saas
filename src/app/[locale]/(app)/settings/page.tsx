import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'

export default async function SettingsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()

  const sections = [
    { href: `/${locale}/settings/general`, title: t('settings.general.title'), description: t('settings.general.subtitle') },
    { href: `/${locale}/settings/members`, title: 'Team members', description: 'Roles, member removal, and pending invitations.' },
    { href: `/${locale}/departments`, title: t('departments.title'), description: t('departments.subtitle') },
    { href: `/${locale}/settings/integrations`, title: 'Integrations', description: 'Connect QuickBooks, MyRavex and other services.' },
    { href: `/${locale}/settings/devices`, title: t('devices.title'), description: t('devices.subtitle') },
    { href: `/${locale}/settings/payments`, title: t('bank.title'), description: t('bank.subtitle') },
    { href: `/${locale}/settings/notifications`, title: 'Notifications', description: 'Choose how you receive alerts (email, SMS, push).' },
    { href: `/${locale}/settings/api-keys`, title: 'API keys', description: 'Manage REST API access tokens (Premium plan).' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.settings')} />

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-lg">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
