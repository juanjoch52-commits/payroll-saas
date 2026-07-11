import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'
import { getWeekView } from '@/lib/timesheets/core'

// GET /api/v1/time/week?week=YYYY-MM-DD  (app móvil — Bearer JWT del empleado)
// Vista semanal completa: días+entries, totales, submission, política de
// descanso, timezone de la org y navegación prev/next. `week` opcional
// (default: semana en curso en el tz de la org; debe ser lunes).
export async function GET(req: Request) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const week = new URL(req.url).searchParams.get('week')
  const admin = createAdminClient()
  const data = await getWeekView(
    admin,
    { employeeId: auth.employeeId, organizationId: auth.organizationId, userId: auth.userId },
    week,
  )
  return NextResponse.json({ data })
}
