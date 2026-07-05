'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Ajustes de organización (timezone, …)
// =============================================================================

export async function setOrganizationTimezone(
  timezone: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }

  // Validar que es un timezone IANA real (Intl lanza si no).
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
  } catch {
    return { success: false, error: 'Timezone inválido.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ timezone })
    .eq('id', session.organizationId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/general', 'page')
  revalidatePath('/(app)/dashboard', 'page')
  return { success: true }
}
