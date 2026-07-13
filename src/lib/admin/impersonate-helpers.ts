/**
 * Helpers sync para leer el estado de impersonation desde Server Components.
 * Separado de impersonate.ts (que tiene 'use server' y solo permite async exports).
 */

import { cookies } from 'next/headers'

import { createAdminClient } from '@/lib/supabase/server'

const COOKIE_NAME = 'myjova_impersonation'

export type ImpersonationCookie = {
  sessionId: string
  targetUserId: string
  targetOrgId: string
  adminUserId: string
  startedAt: number
}

export function getActiveImpersonation(): ImpersonationCookie | null {
  const raw = cookies().get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as ImpersonationCookie
  } catch {
    return null
  }
}

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

export async function isImpersonating(): Promise<boolean> {
  return getActiveImpersonation() !== null
}
