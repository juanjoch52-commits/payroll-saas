import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { YearEndForm } from '@/components/reports/YearEndForm'

export default async function ReportsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const hasFeature = await checkFeature(session.organizationId, 'tax_forms')

  const { data: forms } = await supabase
    .from('tax_forms')
    .select('id, form_type, tax_year, generated_at, pdf_storage_path')
    .eq('organization_id', session.organizationId)
    .order('tax_year', { ascending: false })
    .order('generated_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.yearEnd')}</CardTitle>
          <CardDescription>
            {hasFeature ? t('reports.selectYear') : t('reports.upgradeRequired')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasFeature ? <YearEndForm /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated forms</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Form</th>
                <th className="py-2 font-medium">Year</th>
                <th className="py-2 font-medium">Generated</th>
              </tr>
            </thead>
            <tbody>
              {(forms ?? []).map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="py-2 font-medium">{f.form_type}</td>
                  <td className="py-2">{f.tax_year}</td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(f.generated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!forms || forms.length === 0) && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
