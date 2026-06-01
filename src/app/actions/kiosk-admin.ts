'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Administración del kiosko (sesión, role-gated)
// =============================================================================
// PIN de empleado para fichar en el kiosko. Se guarda en employee_pins (tabla
// aislada sin RLS pública) vía service role para que los hashes nunca sean
// legibles por otros usuarios.
// =============================================================================

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

const setPinSchema = z.object({
  employeeId: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos.'),
})

export type KioskAdminResult = { success: boolean; error?: string }

/** Manager fija (o resetea) el PIN de fichaje de un empleado. */
export async function setEmployeePin(input: {
  employeeId: string
  pin: string
}): Promise<KioskAdminResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  const parsed = setPinSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = createClient()
  // El empleado debe pertenecer a la org (RLS aplica al leer).
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('id', parsed.data.employeeId)
    .eq('organization_id', session.organizationId)
    .single()
  if (!emp) return { success: false, error: 'Empleado no encontrado.' }

  // El hash incluye el employee_id como prefijo (defensa: liga el hash al
  // empleado). El kiosko compara con el mismo prefijo.
  const hash = await bcrypt.hash(`${parsed.data.employeeId}:${parsed.data.pin}`, 10)

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { success: false, error: 'Servidor sin configurar (falta service role key).' }
  }

  const nowIso = new Date().toISOString()
  const { error } = await admin.from('employee_pins').upsert({
    employee_id: parsed.data.employeeId,
    organization_id: session.organizationId,
    pin_hash: hash,
    pin_set_at: nowIso,
    pin_locked_until: null,
    updated_at: nowIso,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/devices', 'page')
  return { success: true }
}

/** Manager elimina el PIN de un empleado (no podrá fichar en kiosko). */
export async function clearEmployeePin(employeeId: string): Promise<KioskAdminResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { success: false, error: 'Servidor sin configurar.' }
  }

  const { error } = await admin
    .from('employee_pins')
    .delete()
    .eq('employee_id', employeeId)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/devices', 'page')
  return { success: true }
}
