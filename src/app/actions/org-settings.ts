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

/**
 * Política de descanso no pagado: descontar `minutes` de almuerzo cuando el
 * turno alcanza `thresholdMinutes`. minutes=0 desactiva el descuento.
 * Aplica a clock-outs FUTUROS (no recalcula entries existentes).
 */
export async function setBreakPolicy(
  minutes: number,
  thresholdMinutes: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 120) {
    return { success: false, error: 'Los minutos de descanso deben estar entre 0 y 120.' }
  }
  if (!Number.isInteger(thresholdMinutes) || thresholdMinutes < 0 || thresholdMinutes > 720) {
    return { success: false, error: 'El umbral debe estar entre 0 y 12 horas.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('organizations')
    .update({
      break_auto_deduct_minutes: minutes,
      break_auto_deduct_threshold_minutes: thresholdMinutes,
    })
    .eq('id', session.organizationId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/general', 'page')
  return { success: true }
}
