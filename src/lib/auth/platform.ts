import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireSession, type ActiveSession } from '@/lib/auth/session'

/**
 * Guard para rutas /admin/* — solo platform_admins de MyJova.
 *
 * Para convertir tu cuenta en platform_admin, después de signup ejecutar
 * en Supabase SQL Editor:
 *
 *   insert into platform_admins (user_id, granted_by, notes)
 *   values ('<tu-user-id>', '<tu-user-id>', 'Founder');
 */
export async function requirePlatformAdmin(locale: string): Promise<ActiveSession> {
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()
  const { data } = await supabase.rpc('is_platform_admin')
  if (!data) redirect(`/${locale}/dashboard`)
  return session
}
