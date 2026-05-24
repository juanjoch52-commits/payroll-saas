import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { ClockControls } from '@/components/employee/ClockControls'

export default async function EmployeeClockPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  // Encontrar la fila de employees del user
  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name, last_name, organization_id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  // Entry abierto (si existe)
  const { data: openEntry } = employee
    ? await supabase
        .from('time_entries')
        .select('id, clock_in_at, clock_in_outside_geofence')
        .eq('employee_id', employee.id)
        .is('clock_out_at', null)
        .maybeSingle()
    : { data: null }

  return (
    <div className="container max-w-md py-6">
      <ClockControls
        locale={locale}
        employeeName={employee ? `${employee.first_name} ${employee.last_name}` : null}
        openEntry={openEntry as { id: string; clock_in_at: string; clock_in_outside_geofence: boolean } | null}
      />
    </div>
  )
}
