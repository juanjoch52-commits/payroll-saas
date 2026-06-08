import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { DepartmentsManager } from '@/components/admin/DepartmentsManager'

export default async function DepartmentsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }
  const supabase = createClient()

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
    .order('name')

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, department_id')
    .eq('organization_id', session.organizationId)
    .eq('status', 'active')
    .order('first_name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('departments.title')}</h1>
        <p className="text-muted-foreground">{t('departments.subtitle')}</p>
      </div>
      <DepartmentsManager
        departments={(departments ?? []) as never}
        employees={(employees ?? []) as never}
      />
    </div>
  )
}
