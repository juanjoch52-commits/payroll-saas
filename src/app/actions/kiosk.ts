'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateKioskDevice } from '@/lib/kiosk/auth'
import { isWithinGeofence } from '@/lib/geo'

// =============================================================================
// Server Actions — Runtime del kiosko (SIN sesión, autenticado por device_token)
// =============================================================================
// Estas acciones las llama la tablet pública. NUNCA usan la sesión del usuario;
// validan el device_token y operan con service role. El organizationId y el
// worksiteId SIEMPRE salen de la fila del device (aislamiento de tenant).
// =============================================================================

const MAX_FAILS = 5
const LOCK_MINUTES = 15

function randomToken(len: number): string {
  return randomBytes(len * 2)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, len)
}

// -----------------------------------------------------------------------------
// 1) Emparejar la tablet: canjea el código corto por un device_token permanente.
// -----------------------------------------------------------------------------
export type RedeemResult =
  | { success: true; token: string; deviceName: string }
  | { success: false; error: string }

export async function redeemPairingCode(code: string): Promise<RedeemResult> {
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return { success: false, error: 'Código inválido.' }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { success: false, error: 'Kiosk no disponible (servidor sin configurar).' }
  }

  const { data: device } = await admin
    .from('kiosk_devices')
    .select('id, name, pairing_code_expires_at')
    .eq('pairing_code', code)
    .maybeSingle()

  if (!device) return { success: false, error: 'Código no encontrado.' }
  if (device.pairing_code_expires_at && new Date(device.pairing_code_expires_at) < new Date()) {
    return { success: false, error: 'Código expirado. Genera uno nuevo.' }
  }

  const token = 'kdv_' + randomToken(32)
  const hash = await bcrypt.hash(token, 10)
  const prefix = token.slice(0, 12)

  const { error } = await admin
    .from('kiosk_devices')
    .update({
      device_token_hash: hash,
      device_token_prefix: prefix,
      is_active: true,
      pairing_code: null,
      pairing_code_expires_at: null,
    })
    .eq('id', device.id)

  if (error) return { success: false, error: error.message }
  return { success: true, token, deviceName: device.name }
}

// -----------------------------------------------------------------------------
// 2) Roster: lista de empleados activos del org del device (sin datos sensibles).
// -----------------------------------------------------------------------------
export type RosterResult =
  | { success: true; worksiteName: string; employees: { id: string; name: string; hasPin: boolean }[] }
  | { success: false; error: string }

export async function kioskRoster(token: string): Promise<RosterResult> {
  const auth = await authenticateKioskDevice(token)
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = createAdminClient()

  const { data: employees } = await admin
    .from('employees')
    .select('id, first_name, last_name')
    .eq('organization_id', auth.organizationId)
    .eq('status', 'active')
    .order('first_name')

  const { data: pins } = await admin
    .from('employee_pins')
    .select('employee_id')
    .eq('organization_id', auth.organizationId)

  const pinSet = new Set((pins ?? []).map((p: { employee_id: string }) => p.employee_id))

  const { data: worksite } = await admin
    .from('worksites')
    .select('name')
    .eq('id', auth.worksiteId)
    .maybeSingle()

  return {
    success: true,
    worksiteName: (worksite as { name: string } | null)?.name ?? '',
    employees: (employees ?? []).map((e: { id: string; first_name: string; last_name: string }) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      hasPin: pinSet.has(e.id),
    })),
  }
}

// -----------------------------------------------------------------------------
// 3) Check-in/out: valida PIN (con lockout), sube selfie, ficha entrada o salida.
// -----------------------------------------------------------------------------
export type KioskCheckInResult =
  | { success: true; action: 'in' | 'out'; employeeName: string; outsideGeofence: boolean }
  | { success: false; error: string; locked?: boolean }

export async function kioskCheckIn(input: {
  token: string
  employeeId: string
  pin: string
  photoBase64?: string
  lat?: number
  lng?: number
}): Promise<KioskCheckInResult> {
  const auth = await authenticateKioskDevice(input.token)
  if (!auth.ok) return { success: false, error: auth.error }
  const { deviceId, organizationId, worksiteId } = auth
  const admin = createAdminClient()

  if (!/^\d{4}$/.test(input.pin)) return { success: false, error: 'PIN inválido.' }

  // Empleado del MISMO org (aislamiento), activo.
  const { data: emp } = await admin
    .from('employees')
    .select('id, first_name, last_name, status')
    .eq('id', input.employeeId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!emp || (emp as { status: string }).status !== 'active') {
    return { success: false, error: 'Empleado no válido.' }
  }
  const employee = emp as { id: string; first_name: string; last_name: string; status: string }

  const { data: pinRow } = await admin
    .from('employee_pins')
    .select('pin_hash, pin_locked_until')
    .eq('employee_id', employee.id)
    .maybeSingle()
  if (!pinRow) return { success: false, error: 'Este empleado no tiene PIN configurado.' }
  const pin = pinRow as { pin_hash: string; pin_locked_until: string | null }

  const now = new Date()

  // Lockout activo
  if (pin.pin_locked_until && new Date(pin.pin_locked_until) > now) {
    return { success: false, error: 'Demasiados intentos. Espera unos minutos.', locked: true }
  }

  // Demasiados fallos recientes → bloquear
  const windowStart = new Date(now.getTime() - LOCK_MINUTES * 60_000).toISOString()
  const { count: recentFails } = await admin
    .from('kiosk_pin_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employee.id)
    .eq('succeeded', false)
    .gte('created_at', windowStart)
  if ((recentFails ?? 0) >= MAX_FAILS) {
    await admin
      .from('employee_pins')
      .update({ pin_locked_until: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() })
      .eq('employee_id', employee.id)
    return { success: false, error: 'Demasiados intentos. Espera unos minutos.', locked: true }
  }

  // Verificar PIN (mismo salt-prefijo que setEmployeePin)
  const ok = await bcrypt.compare(`${employee.id}:${input.pin}`, pin.pin_hash)
  if (!ok) {
    await admin.from('kiosk_pin_attempts').insert({
      organization_id: organizationId,
      kiosk_device_id: deviceId,
      employee_id: employee.id,
      succeeded: false,
    })
    if ((recentFails ?? 0) + 1 >= MAX_FAILS) {
      await admin
        .from('employee_pins')
        .update({ pin_locked_until: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() })
        .eq('employee_id', employee.id)
    }
    return { success: false, error: 'PIN incorrecto.' }
  }

  // Éxito: registrar + limpiar lockout
  await admin.from('kiosk_pin_attempts').insert({
    organization_id: organizationId,
    kiosk_device_id: deviceId,
    employee_id: employee.id,
    succeeded: true,
  })
  if (pin.pin_locked_until) {
    await admin.from('employee_pins').update({ pin_locked_until: null }).eq('employee_id', employee.id)
  }

  // Geofence contra el worksite ligado al device
  let outsideGeofence = false
  if (input.lat != null && input.lng != null) {
    const { data: w } = await admin
      .from('worksites')
      .select('latitude, longitude, radius_m')
      .eq('id', worksiteId)
      .maybeSingle()
    const ws = w as { latitude: number; longitude: number; radius_m: number } | null
    if (ws) {
      outsideGeofence = !isWithinGeofence(
        { lat: input.lat, lng: input.lng },
        { latitude: Number(ws.latitude), longitude: Number(ws.longitude), radius_m: ws.radius_m },
      )
    }
  }

  const photoBuffer = input.photoBase64 ? Buffer.from(input.photoBase64, 'base64') : null
  const employeeName = `${employee.first_name} ${employee.last_name}`

  // ¿Turno abierto? → clock OUT; si no → clock IN
  const { data: openEntry } = await admin
    .from('time_entries')
    .select('id, clock_in_at')
    .eq('employee_id', employee.id)
    .is('clock_out_at', null)
    .maybeSingle()

  if (openEntry) {
    const entry = openEntry as { id: string; clock_in_at: string }
    let photoPath: string | null = null
    if (photoBuffer) {
      photoPath = `${organizationId}/${employee.id}/${entry.id}-out.jpg`
      await admin.storage
        .from('time-photos')
        .upload(photoPath, photoBuffer, { contentType: 'image/jpeg', upsert: true })
    }
    const clockOutAt = new Date()
    const durationMinutes = Math.max(
      0,
      Math.round((clockOutAt.getTime() - new Date(entry.clock_in_at).getTime()) / 60_000),
    )
    const { error } = await admin
      .from('time_entries')
      .update({
        clock_out_at: clockOutAt.toISOString(),
        clock_out_lat: input.lat ?? null,
        clock_out_lng: input.lng ?? null,
        clock_out_photo_path: photoPath,
        clock_out_outside_geofence: outsideGeofence,
        duration_minutes: durationMinutes,
        billable_minutes: durationMinutes,
        status: 'pending',
      })
      .eq('id', entry.id)
    if (error) return { success: false, error: error.message }
    return { success: true, action: 'out', employeeName, outsideGeofence }
  }

  // Clock IN
  const snapshotId = randomUUID()
  let photoPath: string | null = null
  if (photoBuffer) {
    photoPath = `${organizationId}/${employee.id}/${snapshotId}-in.jpg`
    await admin.storage
      .from('time-photos')
      .upload(photoPath, photoBuffer, { contentType: 'image/jpeg', upsert: false })
  }
  const { error } = await admin.from('time_entries').insert({
    organization_id: organizationId,
    employee_id: employee.id,
    user_id: null,
    worksite_id: worksiteId,
    kiosk_device_id: deviceId,
    clock_in_lat: input.lat ?? null,
    clock_in_lng: input.lng ?? null,
    clock_in_photo_path: photoPath,
    clock_in_outside_geofence: outsideGeofence,
    status: 'open',
  })
  if (error) {
    if (photoPath) await admin.storage.from('time-photos').remove([photoPath])
    return { success: false, error: error.message }
  }
  return { success: true, action: 'in', employeeName, outsideGeofence }
}
