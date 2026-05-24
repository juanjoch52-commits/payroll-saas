import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NewPayrollRunForm } from '@/components/payroll/NewPayrollRunForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewPayrollRunPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/${locale}/payroll`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('payroll.newRun')}</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPayrollRunForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  )
}
