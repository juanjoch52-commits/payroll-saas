import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { WorksiteForm } from '@/components/admin/WorksiteForm'
import { LiveMap, type MapGeofence } from '@/components/admin/LiveMap'

export default async function WorksitesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: worksites } = await supabase
    .from('worksites')
    .select('id, name, address, latitude, longitude, radius_m, is_active, created_at')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })

  const geofences: MapGeofence[] = (worksites ?? [])
    .filter((w: { is_active: boolean }) => w.is_active)
    .map((w: { id: string; name: string; latitude: number; longitude: number; radius_m: number }) => ({
      id: w.id,
      lat: Number(w.latitude),
      lng: Number(w.longitude),
      radius_m: w.radius_m,
      label: w.name,
    }))

  return (
    <div className="space-y-6">
      <PageHeader title={t('worksites.title')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('worksites.addWorksite')}</CardTitle>
          </CardHeader>
          <CardContent>
            <WorksiteForm locale={locale} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configured worksites</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LiveMap points={[]} geofences={geofences} height={350} />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('worksites.name')}</th>
              <th className="px-4 py-3 font-medium">{t('worksites.address')}</th>
              <th className="px-4 py-3 font-medium">Coordinates</th>
              <th className="px-4 py-3 font-medium">{t('worksites.radius')}</th>
              <th className="px-4 py-3 font-medium">{t('worksites.active')}</th>
            </tr>
          </thead>
          <tbody>
            {(worksites ?? []).map((w: { id: string; name: string; address: string | null; latitude: number; longitude: number; radius_m: number; is_active: boolean }) => (
              <tr key={w.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{w.address ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono">
                  {Number(w.latitude).toFixed(5)}, {Number(w.longitude).toFixed(5)}
                </td>
                <td className="px-4 py-3">{w.radius_m}m</td>
                <td className="px-4 py-3">
                  {w.is_active ? (
                    <Badge variant="success">{t('common.yes')}</Badge>
                  ) : (
                    <Badge variant="muted">{t('common.no')}</Badge>
                  )}
                </td>
              </tr>
            ))}
            {(!worksites || worksites.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
