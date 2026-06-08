import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { isEncryptionConfigured } from '@/lib/crypto/secretbox'
import { PaymentsSettings } from '@/components/settings/PaymentsSettings'

export default async function PaymentsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }
  const supabase = createClient()

  const { data: company } = await supabase
    .from('company_bank_accounts')
    .select('company_name, company_id, account_last_four')
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, pay_date')
    .eq('organization_id', session.organizationId)
    .order('pay_date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('bank.title')}</h1>
        <p className="text-muted-foreground">{t('bank.subtitle')}</p>
      </div>
      <PaymentsSettings
        encryptionReady={isEncryptionConfigured()}
        company={(company as { company_name: string | null; company_id: string | null; account_last_four: string | null } | null) ?? null}
        runs={(runs ?? []) as never}
      />
    </div>
  )
}
