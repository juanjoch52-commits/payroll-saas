import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InviteEmployeeButton } from '@/components/employees/InviteEmployeeButton'
import { formatMoney, formatDate } from '@/lib/utils'

export default async function EmployeeDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: employee } = await supabase
    .from('employees')
    .select(
      'id, first_name, last_name, email, phone, hire_date, status, employee_type, job_title, primary_jurisdiction_code, tax_id_last_four, user_id, pay_schemes(scheme_type, config, effective_from, effective_to)',
    )
    .eq('id', id)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!employee) notFound()

  const schemes = (Array.isArray(employee.pay_schemes) ? employee.pay_schemes : [employee.pay_schemes])
    .filter(Boolean) as Array<{
      scheme_type: string
      config: Record<string, unknown>
      effective_from: string
      effective_to: string | null
    }>

  const activeScheme = schemes.find((s) => !s.effective_to)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${locale}/employees`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.first_name} {employee.last_name}
          </h1>
          {employee.job_title && (
            <p className="text-muted-foreground">{employee.job_title}</p>
          )}
        </div>
        {!employee.user_id && employee.email && (
          <InviteEmployeeButton
            employeeId={employee.id}
            email={employee.email}
            locale={locale}
          />
        )}
        {employee.user_id && (
          <Badge variant="success" className="px-3 py-1">
            Portal account active
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {employee.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{employee.email}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{employee.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hire date</span>
              <span>{formatDate(employee.hire_date, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{employee.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="capitalize">{employee.employee_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jurisdiction</span>
              <span>{employee.primary_jurisdiction_code}</span>
            </div>
            {employee.tax_id_last_four && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SSN</span>
                <span>•••-••-{employee.tax_id_last_four}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pay scheme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {activeScheme ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize">
                    {t(`employees.schemes.${activeScheme.scheme_type as 'hourly'}` as 'employees.schemes.hourly')}
                  </span>
                </div>
                {activeScheme.scheme_type === 'hourly' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>
                      {formatMoney(Number((activeScheme.config as { rate_cents?: number }).rate_cents ?? 0), locale)} /hr
                    </span>
                  </div>
                )}
                {activeScheme.scheme_type === 'salary' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual</span>
                    <span>
                      {formatMoney(Number((activeScheme.config as { annual_cents?: number }).annual_cents ?? 0), locale)}
                    </span>
                  </div>
                )}
                {activeScheme.scheme_type === 'daily' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily rate</span>
                    <span>
                      {formatMoney(Number((activeScheme.config as { daily_rate_cents?: number }).daily_rate_cents ?? 0), locale)}
                    </span>
                  </div>
                )}
                {activeScheme.scheme_type === 'commission' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>
                      {((Number((activeScheme.config as { rate_pct?: number }).rate_pct ?? 0)) * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No active pay scheme.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
