import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'
import { performClockOut } from '@/lib/time/clock'

// POST /api/v1/time/clock-out  (app móvil — Bearer JWT del empleado)
const schema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  accuracy: z.number().optional(),
  photoBase64: z.string().optional(),
})

export async function POST(req: Request) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const parsed = schema.safeParse((await req.json().catch(() => null)) ?? {})
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const admin = createAdminClient()
  const res = await performClockOut(admin, {
    organizationId: auth.organizationId,
    employeeId: auth.employeeId,
    userId: auth.userId,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    accuracy: parsed.data.accuracy,
    photoBuffer: parsed.data.photoBase64 ? Buffer.from(parsed.data.photoBase64, 'base64') : null,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
  return NextResponse.json({ data: res })
}
