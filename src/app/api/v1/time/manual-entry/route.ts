import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'
import { addManualEntryCore } from '@/lib/timesheets/core'

// POST /api/v1/time/manual-entry  (app móvil — "olvidé fichar", queda pending)
const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeIn: z.string().regex(/^\d{2}:\d{2}$/),
  timeOut: z.string().regex(/^\d{2}:\d{2}$/),
  noBreak: z.boolean().optional(),
  reason: z.string().trim().min(3).max(500),
})

export async function POST(req: Request) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const parsed = schema.safeParse((await req.json().catch(() => null)) ?? {})
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const admin = createAdminClient()
  const res = await addManualEntryCore(
    admin,
    { employeeId: auth.employeeId, organizationId: auth.organizationId, userId: auth.userId },
    parsed.data,
  )
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ data: { ok: true } })
}
