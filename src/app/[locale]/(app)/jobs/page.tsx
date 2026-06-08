import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { JobsManager } from '@/components/admin/JobsManager'

export default async function JobsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }
  const supabase = createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, name, contract_number, prevailing_wage, worksite_id, worksites(name)')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
    .order('name')

  const { data: worksites } = await supabase
    .from('worksites')
    .select('id, name')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('jobs.title')}</h1>
        <p className="text-muted-foreground">{t('jobs.subtitle')}</p>
      </div>
      <JobsManager jobs={(jobs ?? []) as never} worksites={(worksites ?? []) as never} />
    </div>
  )
}
