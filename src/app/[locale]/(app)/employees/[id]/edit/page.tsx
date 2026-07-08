import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmployeeEditForm, type EmployeeEditDefaults } from '@/components/employees/EmployeeEditForm'

export default async function EmployeeEditPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const [{ data: employee }, { data: jurisdictions }, { data: subcontractors }] = await Promise.all([
    supabase
      .from('employees')
      .select(
        'id, first_name, last_name, email, phone, hire_date, employee_type, job_title, primary_jurisdiction_code, locality_code, subcontractor_id, bill_rate_cents, w4_filing_status, w4_dependents, tax_id_last_four',
      )
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .maybeSingle(),
    supabase.from('jurisdictions').select('code, name').order('code'),
    supabase.from('subcontractors').select('id, name').eq('is_active', true).order('name').limit(500),
  ])

  if (!employee) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${locale}/employees/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('common.edit')}: {(employee as EmployeeEditDefaults).first_name}{' '}
            {(employee as EmployeeEditDefaults).last_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeEditForm
            employee={employee as EmployeeEditDefaults}
            jurisdictions={(jurisdictions ?? []) as { code: string; name: string }[]}
            subcontractors={(subcontractors ?? []) as { id: string; name: string }[]}
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  )
}
