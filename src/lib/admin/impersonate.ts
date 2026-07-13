'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'

const COOKIE_NAME = 'myjova_impersonation'
const MAX_AGE_SECONDS = 60 * 60 * 2 // 2 hours max

export type ImpersonationCookie = {
  sessionId: string
  targetUserId: string
  targetOrgId: string
  adminUserId: string
  startedAt: number
}

export async function startImpersonation(formData: FormData) {
  const targetUserId = String(formData.get('targetUserId') || '')
  const targetOrgId = String(formData.get('targetOrgId') || '')
  const reason = String(formData.get('reason') || '')
  const locale = String(formData.get('locale') || 'en')

  if (!targetUserId || !targetOrgId || !reason || reason.length < 5) {
    return { success: false, error: 'Reason is required (min 5 chars)' }
  }

  const session = await requirePlatformAdmin(locale)
  const admin = createAdminClient()
  const hdrs = headers()

  const { data, error } = await admin
    .from('impersonation_sessions')
    .insert({
      admin_user_id: session.userId,
      target_user_id: targetUserId,
      target_org_id: targetOrgId,
      reason,
      ip_address: hdrs.get('x-forwarded-for') ?? null,
      user_agent: hdrs.get('user-agent') ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create session' }
  }

  const cookieValue: ImpersonationCookie = {
    sessionId: data.id,
    targetUserId,
    targetOrgId,
    adminUserId: session.userId,
    startedAt: Date.now(),
  }

  cookies().set(COOKIE_NAME, JSON.stringify(cookieValue), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })

  redirect(`/${locale}/dashboard`)
}

export async function endImpersonation(locale: string = 'en') {
  const raw = cookies().get(COOKIE_NAME)?.value
  if (!raw) {
    redirect(`/${locale}/admin`)
  }

  let parsed: ImpersonationCookie | null = null
  try {
    parsed = JSON.parse(raw) as ImpersonationCookie
  } catch {
    // corrupt cookie
  }

  if (parsed) {
    const admin = createAdminClient()
    await admin
      .from('impersonation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', parsed.sessionId)
      .is('ended_at', null)
  }

  cookies().delete(COOKIE_NAME)
  redirect(`/${locale}/admin`)
}
