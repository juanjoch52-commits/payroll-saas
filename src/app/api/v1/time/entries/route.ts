import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'

// GET /api/v1/time/entries → últimas 30 entries del empleado autenticado.
export async function GET(req: Request) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('time_entries')
    .select(
      'id, clock_in_at, clock_out_at, billable_minutes, status, clock_in_outside_geofence, clock_out_outside_geofence',
    )
    .eq('employee_id', auth.employeeId)
    .order('clock_in_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ data: data ?? [] })
}
