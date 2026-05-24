import Link from 'next/link'
import { ChevronLeft, Plug, Lock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'

export default async function IntegrationsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const hasMyRavex = await checkFeature(session.organizationId, 'myravex_integration')

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/settings`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                MyRavex
              </CardTitle>
              <CardDescription>
                Sync employees, time entries, and job assignments with MyRavex (FSM).
              </CardDescription>
            </div>
            {!hasMyRavex && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                <Lock className="h-3 w-3" />
                Premium Bundle
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Button disabled>{hasMyRavex ? 'Coming soon' : 'Upgrade to connect'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
