import Link from 'next/link'
import { Plane, ChevronRight, FileSignature, Landmark } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EmployeeProfilePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('first_name, last_name, email, phone, hire_date, job_title, primary_jurisdiction_code, tax_id_last_four')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  return (
    <div className="container max-w-md py-6">
      <h1 className="mb-4 text-2xl font-bold">{t('nav.profile')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {employee?.first_name} {employee?.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{employee?.email ?? session.email}</span>
          </div>
          {employee?.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{employee.phone}</span>
            </div>
          )}
          {employee?.job_title && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Job title</span>
              <span>{employee.job_title}</span>
            </div>
          )}
          {employee?.hire_date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hire date</span>
              <span>{employee.hire_date}</span>
            </div>
          )}
          {employee?.tax_id_last_four && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">SSN</span>
              <span>•••-••-{employee.tax_id_last_four}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Organization</span>
            <span>{session.organizationName}</span>
          </div>
        </CardContent>
      </Card>

      <Link
        href={`/${locale}/my-time-off`}
        className="mt-4 flex items-center justify-between rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
      >
        <span className="flex items-center gap-2">
          <Plane className="h-4 w-4" /> {t('timeOff.myTitle')}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <Link
        href={`/${locale}/my-documents`}
        className="mt-3 flex items-center justify-between rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
      >
        <span className="flex items-center gap-2">
          <FileSignature className="h-4 w-4" /> {t('documents.myTitle')}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <Link
        href={`/${locale}/my-bank`}
        className="mt-3 flex items-center justify-between rounded-lg border bg-card p-4 text-sm font-medium hover:bg-accent"
      >
        <span className="flex items-center gap-2">
          <Landmark className="h-4 w-4" /> {t('bank.myTitle')}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        To update your information, contact your manager.
      </p>
    </div>
  )
}
