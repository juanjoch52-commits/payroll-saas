'use server'

import { revalidatePath } from 'next/cache'
import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// Charset sin caracteres ambiguos (sin 0/O, 1/I/L) para el código de emparejamiento.
const PAIRING_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function makePairingCode(len = 8): string {
  let out = ''
  for (let i = 0; i < len; i++) out += PAIRING_CHARS[randomInt(PAIRING_CHARS.length)]
  return out
}

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

// -----------------------------------------------------------------------------
// Dispositivos kiosko: emparejar / desactivar / borrar
// -----------------------------------------------------------------------------

const pairSchema = z.object({
  worksiteId: z.string().uuid(),
  name: z.string().min(1).max(80),
})

/** Owner/admin genera un código de emparejamiento para una tablet nueva. */
export async function createKioskPairingCode(input: {
  worksiteId: string
  name: string
}): Promise<{ success: true; code: string; deviceId: string } | { success: false; error: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }

  const parsed = pairSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = createClient()
  // El worksite debe pertenecer a la org.
  const { data: ws } = await supabase
    .from('worksites')
    .select('id')
    .eq('id', parsed.data.worksiteId)
    .eq('organization_id', session.organizationId)
    .single()
  if (!ws) return { success: false, error: 'Worksite no encontrado.' }

  const code = makePairingCode(8)
  const expires = new Date(Date.now() + 15 * 60_000).toISOString()

  const { data: device, error } = await supabase
    .from('kiosk_devices')
    .insert({
      organization_id: session.organizationId,
      worksite_id: parsed.data.worksiteId,
      name: parsed.data.name,
      is_active: false,
      pairing_code: code,
      pairing_code_expires_at: expires,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error || !device) return { success: false, error: error?.message ?? 'No se pudo crear.' }
  revalidatePath('/(app)/settings/devices', 'page')
  return { success: true, code, deviceId: device.id }
}

/** Desactiva un dispositivo (revoca su token al instante). */
export async function deactivateKioskDevice(deviceId: string): Promise<KioskAdminResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('kiosk_devices')
    .update({ is_active: false, device_token_hash: null, device_token_prefix: null })
    .eq('id', deviceId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/devices', 'page')
  return { success: true }
}

/** Borra un dispositivo. */
export async function deleteKioskDevice(deviceId: string): Promise<KioskAdminResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('kiosk_devices')
    .delete()
    .eq('id', deviceId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/devices', 'page')
  return { success: true }
}
