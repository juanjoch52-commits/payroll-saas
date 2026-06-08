import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { DocumentsManager } from '@/components/admin/DocumentsManager'

export default async function DocumentsPage({
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

  const { data: documents } = await supabase
    .from('documents')
    .select(
      'id, name, kind, storage_path, requires_signature, employee_id, employees(first_name, last_name), document_signatures(id)',
    )
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .eq('organization_id', session.organizationId)
    .eq('status', 'active')
    .order('first_name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('documents.title')}</h1>
        <p className="text-muted-foreground">{t('documents.subtitle')}</p>
      </div>
      <DocumentsManager
        documents={(documents ?? []) as never}
        employees={(employees ?? []) as never}
      />
    </div>
  )
}
