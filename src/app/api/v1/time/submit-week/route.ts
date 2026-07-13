import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'
import { submitWeekCore } from '@/lib/timesheets/core'

// POST /api/v1/time/submit-week  (app móvil — cerrar semana y pedir pago)
const schema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const parsed = schema.safeParse((await req.json().catch(() => null)) ?? {})
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const admin = createAdminClient()
  const res = await submitWeekCore(
    admin,
    { employeeId: auth.employeeId, organizationId: auth.organizationId, userId: auth.userId },
    parsed.data.weekStart,
    parsed.data.note,
  )
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ data: { ok: true } })
}
