import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'

// GET /api/v1/paystubs → recibos del empleado autenticado (resumen).
export async function GET(req: Request) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('payroll_items')
    .select(
      'id, gross_cents, net_cents, federal_tax_cents, social_security_cents, medicare_cents, payroll_runs!inner(period_start, period_end, pay_date, status)',
    )
    .eq('employee_id', auth.employeeId)
    .in('payroll_runs.status', ['approved', 'paid', 'posted'])
    .order('payroll_runs(period_start)', { ascending: false })
    .limit(24)

  return NextResponse.json({ data: data ?? [] })
}
