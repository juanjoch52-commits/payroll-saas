import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'

// POST /api/v1/push/register → guarda el Expo push token del dispositivo.
const schema = z.object({
  expoToken: z.string().min(1),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
})

export async function POST(req: Request) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = schema.safeParse((await req.json().catch(() => null)) ?? {})
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('expo_push_tokens').upsert(
    {
      user_id: auth.userId,
      expo_token: parsed.data.expoToken,
      device_name: parsed.data.deviceName ?? null,
      platform: parsed.data.platform ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'expo_token' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
