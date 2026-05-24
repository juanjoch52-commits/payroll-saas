import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'

export default async function ApiKeysPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()
  const enabled = await checkFeature(session.organizationId, 'api_access')

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at')
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

      <h1 className="text-3xl font-bold tracking-tight">API keys</h1>

      <Card>
        <CardHeader>
          <CardTitle>REST API access</CardTitle>
          <CardDescription>
            {enabled
              ? 'Generate keys to access the MyJova REST API. Each key is shown only once.'
              : 'API access requires the Premium Bundle plan.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enabled ? <ApiKeyManager keys={keys ?? []} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
