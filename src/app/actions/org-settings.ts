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
 * Módulo de contratistas/subcontratistas ON/OFF para esta org (multitenant:
 * las empresas "normales" con empleados por hora/día/salario lo dejan en OFF
 * y nunca ven la sección; se auto-activa al crear el primer contratista).
 */
export async function setUsesSubcontractors(
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  // Candado Premium: ACTIVAR el módulo requiere trial activo o plan con la
  // feature (apagar siempre se puede).
  if (enabled) {
    const { requireSubcontractorsAccess } = await import('@/lib/auth/subcontractorsAccess')
    const lockErr = await requireSubcontractorsAccess(session.organizationId)
    if (lockErr) return lockErr
  }
  const supabase = createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ uses_subcontractors: enabled })
    .eq('id', session.organizationId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/general', 'page')
  revalidatePath('/(app)', 'layout')
  return { success: true }
}

/**
 * Política de descanso no pagado: descontar `minutes` de almuerzo cuando el
 * turno alcanza `thresholdMinutes`. minutes=0 desactiva el descuento.
 * `shiftMinutes` = jornada estándar (contador del reloj; 0 = apagado).
 * Aplica a clock-outs FUTUROS (no recalcula entries existentes).
 */
export async function setBreakPolicy(
  minutes: number,
  thresholdMinutes: number,
  shiftMinutes?: number,
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
  if (
    shiftMinutes !== undefined &&
    (!Number.isInteger(shiftMinutes) || shiftMinutes < 0 || shiftMinutes > 960)
  ) {
    return { success: false, error: 'La jornada estándar debe estar entre 0 y 16 horas.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('organizations')
    .update({
      break_auto_deduct_minutes: minutes,
      break_auto_deduct_threshold_minutes: thresholdMinutes,
      ...(shiftMinutes !== undefined ? { standard_shift_minutes: shiftMinutes } : {}),
    })
    .eq('id', session.organizationId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/general', 'page')
  return { success: true }
}
