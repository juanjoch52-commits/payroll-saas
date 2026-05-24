import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewEmployeePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const supabase = createClient()

  const { data: jurisdictions } = await supabase
    .from('jurisdictions')
    .select('code, name, country')
    .order('country')
    .order('name')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${locale}/employees`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('employees.addEmployee')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm jurisdictions={jurisdictions ?? []} locale={locale} />
        </CardContent>
      </Card>
    </div>
  )
}
