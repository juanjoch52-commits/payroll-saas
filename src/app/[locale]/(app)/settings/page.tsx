import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SettingsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()

  const sections = [
    { href: `/${locale}/settings/api-keys`, title: 'API keys', description: 'Manage REST API access tokens (Premium plan).' },
    { href: `/${locale}/settings/integrations`, title: 'Integrations', description: 'Connect MyRavex and other services.' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('nav.settings')}</h1>

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
