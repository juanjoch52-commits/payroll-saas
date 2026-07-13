import { createAdminClient } from '@/lib/supabase/server'

/**
 * Autenticación de la API REST para la app móvil vía JWT de Supabase.
 *
 * La app manda `Authorization: Bearer <supabase access_token>` (el token de
 * sesión del empleado). Validamos el JWT con `auth.getUser(token)` y resolvemos
 * su org activa + su fila de employee.
 *
 * Distinto de `authenticateApiRequest` (api/auth.ts), que valida API keys
 * `jk_` de integraciones server-to-server.
 */
export type UserAuthResult =
  | { ok: true; userId: string; organizationId: string; employeeId: string | null }
  | { ok: false; status: number; error: string }

export async function authenticateUserRequest(req: Request): Promise<UserAuthResult> {
  const header = req.headers.get('authorization')
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Missing bearer token.' }
  }
  const token = header.slice(7).trim()

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, status: 503, error: 'Server not configured.' }
  }

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token)
  if (error || !user) return { ok: false, status: 401, error: 'Invalid or expired token.' }

  // Org activa: del user_metadata (JWT hook) o la primera membership.
  const activeOrgId = (user.user_metadata?.active_org_id as string | undefined) ?? null
  let orgId = activeOrgId
  if (!orgId) {
    const { data: membership } = await admin
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    orgId = (membership as { organization_id: string } | null)?.organization_id ?? null
  }
  if (!orgId) return { ok: false, status: 403, error: 'No organization for this user.' }

  const { data: emp } = await admin
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  return {
    ok: true,
    userId: user.id,
    organizationId: orgId,
    employeeId: (emp as { id: string } | null)?.id ?? null,
  }
}
