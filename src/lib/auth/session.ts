import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Helpers para leer la sesión + org activa desde Server Components.
 *
 * Las funciones están envueltas en `cache()` de React para que múltiples
 * llamadas durante el mismo render reusen el resultado.
 */

export type Role = 'owner' | 'admin' | 'manager' | 'contractor' | 'employee' | 'viewer'

export type ActiveSession = {
  userId: string
  email: string
  organizationId: string
  role: Role
  organizationName: string
}

/**
 * Devuelve el user activo o null si no hay sesión.
 */
export const getUser = cache(async () => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Devuelve la sesión completa con la organization activa.
 * El JWT hook `custom_access_token_hook` añade `active_org_id` a
 * `user.user_metadata`. Si por alguna razón no está, tomamos la primera
 * membership.
 */
export const getActiveSession = cache(async (): Promise<ActiveSession | null> => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // 1) Intenta leer el active_org_id del JWT
  const activeOrgId = user.user_metadata?.active_org_id as string | undefined

  // 2) Lee la membership de esa org (o la primera, si no hay activa).
  const query = supabase
    .from('memberships')
    .select('organization_id, role, organizations:organization_id (name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  const { data, error } = activeOrgId
    ? await query.eq('organization_id', activeOrgId).single()
    : await query.single()

  if (error || !data) return null

  // Supabase devuelve la FK joined como array u object dependiendo de la versión.
  const orgName =
    Array.isArray(data.organizations)
      ? (data.organizations[0] as { name: string } | undefined)?.name
      : (data.organizations as { name: string } | null)?.name

  return {
    userId: user.id,
    email: user.email!,
    organizationId: data.organization_id,
    role: data.role as Role,
    organizationName: orgName ?? 'Untitled',
  }
})

/**
 * Para usar al inicio de Server Components/Actions protegidos:
 *   const session = await requireSession('/en/login')
 */
export async function requireSession(loginPath: string): Promise<ActiveSession> {
  const session = await getActiveSession()
  if (!session) redirect(loginPath)
  return session
}
