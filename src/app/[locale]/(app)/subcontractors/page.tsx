import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/page-header'
import { SubcontractorsManager, type SubRow } from '@/components/admin/SubcontractorsManager'

export const dynamic = 'force-dynamic'

export default async function SubcontractorsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }

  const supabase = createClient()
  const [{ data: subs }, { data: workers }] = await Promise.all([
    supabase
      .from('subcontractors')
      .select('id, parent_id, name, contact_name, email, is_active')
      .eq('organization_id', session.organizationId)
      .order('created_at')
      .limit(500),
    supabase
      .from('employees')
      .select('subcontractor_id')
      .eq('organization_id', session.organizationId)
      .not('subcontractor_id', 'is', null),
  ])

  const counts = new Map<string, number>()
  for (const w of (workers ?? []) as { subcontractor_id: string }[]) {
    counts.set(w.subcontractor_id, (counts.get(w.subcontractor_id) ?? 0) + 1)
  }
  const rows: SubRow[] = ((subs ?? []) as Omit<SubRow, 'workerCount'>[]).map((s) => ({
    ...s,
    workerCount: counts.get(s.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.subcontractors')}
        description={t('subcontractors.subtitle')}
      />
      <SubcontractorsManager subs={rows} />
    </div>
  )
}
