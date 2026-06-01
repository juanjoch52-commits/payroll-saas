import { getTranslations } from 'next-intl/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { DeviceManager } from '@/components/settings/DeviceManager'

export default async function DevicesPage({
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

  const { data: worksites } = await supabase
    .from('worksites')
    .select('id, name')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
    .order('name')

  const { data: devices } = await supabase
    .from('kiosk_devices')
    .select('id, name, is_active, last_seen_at, worksite_id, worksites(name)')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })

  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .eq('organization_id', session.organizationId)
    .eq('status', 'active')
    .order('first_name')

  // PIN status: employee_pins no tiene policies de RLS (solo service role).
  const pinIds = new Set<string>()
  try {
    const admin = createAdminClient()
    const { data: pins } = await admin
      .from('employee_pins')
      .select('employee_id')
      .eq('organization_id', session.organizationId)
    for (const p of (pins ?? []) as { employee_id: string }[]) pinIds.add(p.employee_id)
  } catch {
    // Sin service role key (dev): se muestra todo como "sin PIN".
  }

  const employeesWithPin = (employees ?? []).map(
    (e: { id: string; first_name: string; last_name: string }) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      hasPin: pinIds.has(e.id),
    }),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('devices.title')}</h1>
        <p className="text-muted-foreground">{t('devices.subtitle')}</p>
      </div>

      <DeviceManager
        locale={locale}
        role={session.role}
        worksites={(worksites ?? []) as never}
        devices={(devices ?? []) as never}
        employees={employeesWithPin}
      />
    </div>
  )
}
