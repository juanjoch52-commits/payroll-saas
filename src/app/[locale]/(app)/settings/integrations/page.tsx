import Link from 'next/link'
import { ChevronLeft, Plug, Lock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'
import { isQuickBooksConfigured } from '@/lib/integrations/quickbooks/client'
import { isSquareConfigured } from '@/lib/integrations/square/client'
import { QuickBooksCard } from '@/components/settings/QuickBooksCard'
import { SquareCard } from '@/components/settings/SquareCard'
import { WebhooksCard } from '@/components/settings/WebhooksCard'

type QboConfig = { accountMapping?: Record<string, string> } | null

export default async function IntegrationsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const hasMyRavex = await checkFeature(session.organizationId, 'myravex_integration')
  const hasQuickBooks = await checkFeature(session.organizationId, 'quickbooks_integration')

  const supabase = createClient()
  const { data: qbo } = await supabase
    .from('integrations')
    .select('status, last_synced_at, last_error, config')
    .eq('organization_id', session.organizationId)
    .eq('provider', 'quickbooks')
    .maybeSingle()
  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, pay_date, status')
    .eq('organization_id', session.organizationId)
    .order('pay_date', { ascending: false })
    .limit(8)

  const qboRow = qbo as
    | { status: string; last_synced_at: string | null; last_error: string | null; config: QboConfig }
    | null

  const { data: sq } = await supabase
    .from('integrations')
    .select('status')
    .eq('organization_id', session.organizationId)
    .eq('provider', 'square')
    .maybeSingle()
  const sqStatus = (sq as { status: string } | null)?.status ?? null

  const { data: webhookRows } = await supabase
    .from('webhook_endpoints')
    .select('id, url, description, events, is_active')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })

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

      <QuickBooksCard
        locale={locale}
        hasFeature={hasQuickBooks}
        serverConfigured={isQuickBooksConfigured()}
        status={qboRow?.status ?? null}
        lastSyncedAt={qboRow?.last_synced_at ?? null}
        lastError={qboRow?.last_error ?? null}
        accountMapping={(qboRow?.config?.accountMapping as never) ?? null}
        runs={(runs ?? []) as never}
      />

      <SquareCard
        locale={locale}
        hasFeature={hasQuickBooks}
        serverConfigured={isSquareConfigured()}
        status={sqStatus}
      />

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
              <Badge variant="warning" className="gap-1">
                <Lock className="h-3 w-3" />
                Premium Bundle
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Button disabled>{hasMyRavex ? 'Coming soon' : 'Upgrade to connect'}</Button>
        </CardContent>
      </Card>

      <WebhooksCard endpoints={(webhookRows ?? []) as never} />
    </div>
  )
}
