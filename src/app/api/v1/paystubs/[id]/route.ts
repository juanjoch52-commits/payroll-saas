import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'

// GET /api/v1/paystubs/[id] → detalle del recibo con sus componentes.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('payroll_items')
    .select(
      'id, gross_cents, net_cents, hours_worked, overtime_hours, days_worked, units_produced, payroll_runs!inner(period_start, period_end, pay_date, status), payroll_components(component_type, code, label, amount_cents)',
    )
    .eq('id', params.id)
    .eq('employee_id', auth.employeeId)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ data })
}
