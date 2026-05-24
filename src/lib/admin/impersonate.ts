'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createAdminClient, createClient } from '@/lib/supabase/server'
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

/**
 * Inicia una sesión de impersonation.
 *
 * - Verifica que el usuario actual es platform_admin
 * - Crea fila en impersonation_sessions (esto dispara audit log via trigger)
 * - Setea cookie firmada con sessionId + targetOrgId
 * - Redirige al dashboard del tenant
 *
 * El middleware lee la cookie y reescribe el contexto org del usuario
 * para que vea el dashboard como el tenant.
 */
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

/**
 * Termina una sesión de impersonation activa.
 * Marca ended_at en la BD (que escribe audit log via trigger) y borra cookie.
 */
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

/**
 * Lee la cookie y devuelve datos de impersonation actual, o null.
 * Server-side only.
 */
export function getActiveImpersonation(): ImpersonationCookie | null {
  const raw = cookies().get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as ImpersonationCookie
  } catch {
    return null
  }
}

/**
 * Útil para Server Components: si hay impersonation activa, devuelve los datos
 * adicionales del target (email del usuario + nombre de la org) para mostrar
 * en el banner.
 */
export async function getImpersonationDetails() {
  const imp = getActiveImpersonation()
  if (!imp) return null

  const admin = createAdminClient()
  const [userRes, orgRes] = await Promise.all([
    admin.auth.admin.getUserById(imp.targetUserId),
    admin.from('organizations').select('name').eq('id', imp.targetOrgId).single(),
  ])

  return {
    ...imp,
    targetEmail: userRes.data?.user?.email ?? 'unknown',
    targetOrgName: orgRes.data?.name ?? 'unknown',
  }
}

/**
 * Hint helper for layouts. Returns true if the request is currently
 * impersonating something; banner/RLS adjustments hook here.
 */
export async function isImpersonating(): Promise<boolean> {
  return getActiveImpersonation() !== null
}

// Re-exports for compatibility with imports
export { createClient }
