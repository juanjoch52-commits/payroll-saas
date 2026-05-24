import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

export default async function EmployeesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select(
      'id, first_name, last_name, email, status, employee_type, hire_date, job_title, primary_jurisdiction_code, pay_schemes!inner(scheme_type)',
    )
    .eq('organization_id', session.organizationId)
    .is('pay_schemes.effective_to', null)
    .order('last_name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('employees.title')}</h1>
          <p className="text-muted-foreground">
            {employees?.length ?? 0} {t('employees.title').toLowerCase()}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/employees/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {t('employees.addEmployee')}
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('employees.firstName')}</th>
              <th className="px-4 py-3 font-medium">{t('employees.hireDate')}</th>
              <th className="px-4 py-3 font-medium">{t('employees.type')}</th>
              <th className="px-4 py-3 font-medium">{t('employees.payScheme')}</th>
              <th className="px-4 py-3 font-medium">{t('employees.jurisdiction')}</th>
              <th className="px-4 py-3 font-medium">{t('employees.status')}</th>
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).map((e) => {
              const scheme = Array.isArray(e.pay_schemes)
                ? e.pay_schemes[0]?.scheme_type
                : (e.pay_schemes as { scheme_type: string } | null)?.scheme_type
              return (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/${locale}/employees/${e.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {e.first_name} {e.last_name}
                    </Link>
                    {e.job_title && (
                      <p className="text-xs text-muted-foreground">{e.job_title}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(e.hire_date, locale)}</td>
                  <td className="px-4 py-3 capitalize">{e.employee_type}</td>
                  <td className="px-4 py-3">
                    {scheme && t(`employees.schemes.${scheme}` as 'employees.schemes.hourly')}
                  </td>
                  <td className="px-4 py-3">{e.primary_jurisdiction_code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        e.status === 'active'
                          ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                          : e.status === 'on_leave'
                            ? 'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'
                            : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'
                      }
                    >
                      {e.status}
                    </span>
                  </td>
                </tr>
              )
            })}
            {(!employees || employees.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
