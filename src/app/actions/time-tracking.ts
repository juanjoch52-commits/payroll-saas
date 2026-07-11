'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { isWithinGeofence } from '@/lib/geo'
import { applyAutoBreak, breakPolicyActive, type BreakPolicy } from '@/lib/time/breaks'
import { localTimeToUtc, todayInTz } from '@/lib/time/tz'
import { addDays, mondayOfKey, formatMinutes } from '@/lib/timesheets/week'

// =============================================================================
// Server Actions — Time tracking (clock in/out)
// =============================================================================
// Reglas:
//   - Solo un user con membership.role='employee' (o superior) puede clockear.
//   - El employee debe estar vinculado a una fila de `employees` (employees.user_id = auth.uid()).
//   - Las fotos se suben al bucket `time-photos` path `{org_id}/{employee_id}/{entry_id}-{in|out}.jpg`.
//   - El geofence chequea cualquier worksite activo de la org; el más cercano gana.
// =============================================================================

const clockInSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().nonnegative().optional(),
  worksiteId: z.string().uuid().optional().or(z.literal('')),
})

export type ClockInResult =
  | { success: true; entryId: string; outsideGeofence: boolean }
  | { success: false; error: string }

/**
 * Empleado registra entrada al trabajo.
 * formData campos esperados:
 *   latitude, longitude, accuracy (number, opcional)
 *   worksiteId (uuid, opcional)
 *   photo (File de cámara)
 */
export async function clockIn(formData: FormData): Promise<ClockInResult> {
  const parsed = clockInSchema.safeParse({
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
    accuracy: formData.get('accuracy') ?? undefined,
    worksiteId: formData.get('worksiteId') ?? '',
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const session = await requireSession('/en/login')
  const supabase = createClient()

  // 1) Encontrar el employee vinculado a este user
  const { data: employee } = await supabase
    .from('employees')
    .select('id, organization_id, status')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!employee) {
    return { success: false, error: 'No estás registrado como empleado en esta organización.' }
  }
  if (employee.status !== 'active') {
    return { success: false, error: 'Tu cuenta de empleado no está activa.' }
  }

  // 2) Verificar que no haya un entry abierto (también lo enforces la BD)
  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('employee_id', employee.id)
    .is('clock_out_at', null)
    .maybeSingle()

  if (openEntry) {
    return { success: false, error: 'Ya tienes un turno abierto. Debes hacer clock out primero.' }
  }

  // 3) Verificar geofence si la org tiene worksites activos
  let outsideGeofence = false
  let worksiteId: string | null = parsed.data.worksiteId || null

  if (!worksiteId) {
    // Si no especificó worksite, buscar el más cercano dentro de radio
    const { data: worksites } = await supabase
      .from('worksites')
      .select('id, latitude, longitude, radius_m')
      .eq('organization_id', employee.organization_id)
      .eq('is_active', true)

    if (worksites && worksites.length > 0) {
      const inside = worksites.find((w) =>
        isWithinGeofence(
          { lat: parsed.data.latitude, lng: parsed.data.longitude },
          { latitude: Number(w.latitude), longitude: Number(w.longitude), radius_m: w.radius_m },
        ),
      )
      if (inside) {
        worksiteId = inside.id
      } else {
        outsideGeofence = true
      }
    }
  } else {
    // Si especificó worksite, validar contra ese específico
    const { data: w } = await supabase
      .from('worksites')
      .select('latitude, longitude, radius_m')
      .eq('id', worksiteId)
      .single()
    if (w) {
      outsideGeofence = !isWithinGeofence(
        { lat: parsed.data.latitude, lng: parsed.data.longitude },
        { latitude: Number(w.latitude), longitude: Number(w.longitude), radius_m: w.radius_m },
      )
    }
  }

  // 4) Subir foto si está presente
  const photoFile = formData.get('photo') as File | null
  let photoPath: string | null = null

  if (photoFile && photoFile.size > 0) {
    const entryIdSnapshot = crypto.randomUUID() // para el nombre del archivo
    photoPath = `${employee.organization_id}/${employee.id}/${entryIdSnapshot}-in.jpg`
    const { error: upErr } = await supabase.storage
      .from('time-photos')
      .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false })
    if (upErr) {
      return { success: false, error: `No se pudo subir la foto: ${upErr.message}` }
    }
  }

  // 5) Insertar time entry
  const { data: entry, error: insErr } = await supabase
    .from('time_entries')
    .insert({
      organization_id: employee.organization_id,
      employee_id: employee.id,
      user_id: session.userId,
      worksite_id: worksiteId,
      clock_in_lat: parsed.data.latitude,
      clock_in_lng: parsed.data.longitude,
      clock_in_accuracy_m: parsed.data.accuracy,
      clock_in_photo_path: photoPath,
      clock_in_outside_geofence: outsideGeofence,
      status: 'open',
    })
    .select('id')
    .single()

  if (insErr || !entry) {
    // Si falló el insert, limpiar la foto huérfana
    if (photoPath) {
      await supabase.storage.from('time-photos').remove([photoPath])
    }
    return { success: false, error: insErr?.message ?? 'No se pudo crear el registro.' }
  }

  revalidatePath('/(employee)', 'layout')
  revalidatePath('/(app)/dashboard', 'page')
  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true, entryId: entry.id, outsideGeofence }
}

// -----------------------------------------------------------------------------

const clockOutSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
  skipBreak: z.enum(['0', '1']).optional(),
})

/** Política de descanso de la org (null si la fila no existe). */
async function fetchBreakPolicy(
  db: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>,
  orgId: string,
): Promise<BreakPolicy | null> {
  const { data } = await db
    .from('organizations')
    .select('break_auto_deduct_minutes, break_auto_deduct_threshold_minutes')
    .eq('id', orgId)
    .maybeSingle()
  const row = data as {
    break_auto_deduct_minutes?: number
    break_auto_deduct_threshold_minutes?: number
  } | null
  if (!row) return null
  return {
    autoDeductMinutes: row.break_auto_deduct_minutes ?? 0,
    thresholdMinutes: row.break_auto_deduct_threshold_minutes ?? 0,
  }
}

export type ClockOutResult =
  | { success: true; entryId: string; durationMinutes: number }
  | { success: false; error: string }

/**
 * Empleado cierra su turno.
 */
export async function clockOut(formData: FormData): Promise<ClockOutResult> {
  const parsed = clockOutSchema.safeParse({
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
    accuracy: formData.get('accuracy') ?? undefined,
    notes: formData.get('notes') ?? '',
    skipBreak: formData.get('skipBreak') ?? '0',
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const session = await requireSession('/en/login')
  const supabase = createClient()

  // 1) Encontrar entry abierto del employee
  const { data: employee } = await supabase
    .from('employees')
    .select('id, organization_id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!employee) return { success: false, error: 'No registrado como empleado.' }

  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('id, clock_in_at, worksite_id')
    .eq('employee_id', employee.id)
    .is('clock_out_at', null)
    .maybeSingle()

  if (!openEntry) return { success: false, error: 'No tienes un turno abierto.' }

  // 2) Verificar geofence (si tiene worksite asociado al entry)
  let outsideGeofence = false
  if (openEntry.worksite_id) {
    const { data: w } = await supabase
      .from('worksites')
      .select('latitude, longitude, radius_m')
      .eq('id', openEntry.worksite_id)
      .single()
    if (w) {
      outsideGeofence = !isWithinGeofence(
        { lat: parsed.data.latitude, lng: parsed.data.longitude },
        { latitude: Number(w.latitude), longitude: Number(w.longitude), radius_m: w.radius_m },
      )
    }
  }

  // 3) Subir foto de salida
  const photoFile = formData.get('photo') as File | null
  let photoPath: string | null = null
  if (photoFile && photoFile.size > 0) {
    photoPath = `${employee.organization_id}/${employee.id}/${openEntry.id}-out.jpg`
    const { error: upErr } = await supabase.storage
      .from('time-photos')
      .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: true })
    if (upErr) return { success: false, error: `Error subiendo foto: ${upErr.message}` }
  }

  // 4) Calcular duración y aplicar descuento de almuerzo de la org
  const clockOutAt = new Date()
  const clockInAt = new Date(openEntry.clock_in_at)
  const durationMinutes = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000))
  const policy = await fetchBreakPolicy(supabase, employee.organization_id)
  const waived = parsed.data.skipBreak === '1' && breakPolicyActive(policy)
  const { breakMinutes, billableMinutes } = applyAutoBreak(durationMinutes, policy, waived)

  // 5) Update entry → status 'pending' (espera aprobación)
  const { error: updErr } = await supabase
    .from('time_entries')
    .update({
      clock_out_at: clockOutAt.toISOString(),
      clock_out_lat: parsed.data.latitude,
      clock_out_lng: parsed.data.longitude,
      clock_out_accuracy_m: parsed.data.accuracy,
      clock_out_photo_path: photoPath,
      clock_out_outside_geofence: outsideGeofence,
      duration_minutes: durationMinutes,
      break_minutes: breakMinutes,
      billable_minutes: billableMinutes,
      break_waived: waived,
      notes: parsed.data.notes || null,
      status: 'pending',
    })
    .eq('id', openEntry.id)

  if (updErr) return { success: false, error: updErr.message }

  revalidatePath('/(employee)', 'layout')
  revalidatePath('/(app)/dashboard', 'page')
  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true, entryId: openEntry.id, durationMinutes }
}

// -----------------------------------------------------------------------------

/**
 * Manager aprueba un time entry → status 'approved' → listo para payroll.
 */
export async function approveTimeEntry(
  entryId: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso para aprobar.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq('id', entryId)
    .eq('organization_id', session.organizationId)
    .in('status', ['pending', 'edited'])

  if (error) return { success: false, error: error.message }

  const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
  await dispatchWebhook(session.organizationId, 'time_entry.approved', { entryId })

  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true }
}

export async function rejectTimeEntry(
  entryId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso para rechazar.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('time_entries')
    .update({
      status: 'rejected',
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
    })
    .eq('id', entryId)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true }
}

/**
 * Manager edita las horas (ajuste manual).
 */
export async function editTimeEntry(
  entryId: string,
  patch: {
    clockInAt?: string
    clockOutAt?: string
    billableMinutes?: number
    breakMinutes?: number
    notes?: string
  },
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso para editar.' }
  }

  // Validación de integridad: sin minutos negativos y clock_out > clock_in.
  if (patch.billableMinutes != null && (!Number.isFinite(patch.billableMinutes) || patch.billableMinutes < 0)) {
    return { success: false, error: 'Los minutos no pueden ser negativos.' }
  }
  if (patch.breakMinutes != null && (!Number.isFinite(patch.breakMinutes) || patch.breakMinutes < 0)) {
    return { success: false, error: 'El descanso no puede ser negativo.' }
  }
  if (
    patch.clockInAt &&
    patch.clockOutAt &&
    new Date(patch.clockOutAt).getTime() <= new Date(patch.clockInAt).getTime()
  ) {
    return { success: false, error: 'La salida debe ser posterior a la entrada.' }
  }

  const supabase = createClient()

  // Guardar los valores originales si es la primera edición
  const { data: current } = await supabase
    .from('time_entries')
    .select('clock_in_at, clock_out_at, billable_minutes, original_clock_in_at')
    .eq('id', entryId)
    .eq('organization_id', session.organizationId)
    .single()

  if (!current) return { success: false, error: 'Entry no encontrado.' }

  const updates: Record<string, unknown> = {
    status: 'edited',
    reviewed_by: session.userId,
    reviewed_at: new Date().toISOString(),
  }

  if (!current.original_clock_in_at) {
    updates.original_clock_in_at = current.clock_in_at
    updates.original_clock_out_at = current.clock_out_at
    updates.original_billable_minutes = current.billable_minutes
  }

  if (patch.clockInAt) updates.clock_in_at = patch.clockInAt
  if (patch.clockOutAt) updates.clock_out_at = patch.clockOutAt
  if (patch.billableMinutes !== undefined) updates.billable_minutes = patch.billableMinutes
  if (patch.breakMinutes !== undefined) updates.break_minutes = patch.breakMinutes
  if (patch.notes !== undefined) updates.review_notes = patch.notes

  const { error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', entryId)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true }
}

/**
 * Devuelve una URL firmada por 1 hora para descargar una foto de time-photos.
 */
export async function getTimePhotoUrl(path: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage.from('time-photos').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

// =============================================================================
// Correcciones del empleado: fichadas olvidadas
// =============================================================================
// Ambas quedan 'pending' con manual_kind + motivo → el manager las ve
// flageadas "Manual" en el panel y las aprueba/rechaza como cualquier entry.
// =============================================================================

/** Managers/admins/owner de la org (para avisos best-effort). */
async function notifyManagers(
  organizationId: string,
  excludeUserId: string,
  title: string,
  body: string,
  dedupePrefix: string,
) {
  try {
    const admin = createAdminClient()
    const { data: managers } = await admin
      .from('memberships')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('role', ['owner', 'admin', 'manager'])
    const { dispatch } = await import('@/lib/notifications/dispatch')
    for (const m of (managers ?? []) as { user_id: string }[]) {
      if (m.user_id === excludeUserId) continue
      await dispatch({
        userId: m.user_id,
        organizationId,
        type: 'time_entry_pending',
        title,
        body,
        dedupeKey: `${dedupePrefix}-${m.user_id}`,
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }
}

/** La semana local de `dayKey` ¿ya fue cerrada (submitted/approved)? */
async function weekIsClosed(
  supabase: ReturnType<typeof createClient>,
  employeeId: string,
  dayKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('timesheet_submissions')
    .select('status')
    .eq('employee_id', employeeId)
    .eq('week_start', mondayOfKey(dayKey))
    .maybeSingle()
  const status = (data as { status?: string } | null)?.status
  return status === 'submitted' || status === 'approved'
}

const manualEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeIn: z.string().regex(/^\d{2}:\d{2}$/),
  timeOut: z.string().regex(/^\d{2}:\d{2}$/),
  noBreak: z.boolean().optional(),
  reason: z.string().trim().min(3, 'Explica qué pasó.').max(500),
})

export type ManualEntryResult = { success: boolean; error?: string }

/**
 * Empleado reporta un turno que olvidó fichar (entrada Y salida manuales).
 * Solo días pasados/hoy, últimos 30 días, sin solaparse con otras entries y
 * nunca dentro de una semana ya cerrada.
 */
export async function addManualEntry(
  input: z.input<typeof manualEntrySchema>,
): Promise<ManualEntryResult> {
  const parsed = manualEntrySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name, last_name, organization_id, status')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!employee) return { success: false, error: 'No estás registrado como empleado.' }
  if (employee.status !== 'active') return { success: false, error: 'Tu cuenta no está activa.' }

  const { data: org } = await supabase
    .from('organizations')
    .select('timezone')
    .eq('id', session.organizationId)
    .maybeSingle()
  const tz = (org as { timezone?: string } | null)?.timezone || 'America/New_York'

  const todayKey = todayInTz(tz)
  if (d.date > todayKey) return { success: false, error: 'No puedes reportar horas futuras.' }
  if (d.date < addDays(todayKey, -30)) {
    return { success: false, error: 'Solo puedes reportar hasta 30 días atrás. Habla con tu manager.' }
  }
  if (await weekIsClosed(supabase, employee.id, d.date)) {
    return { success: false, error: 'Esa semana ya fue cerrada. Pide a tu manager que la ajuste.' }
  }

  const clockInAt = localTimeToUtc(d.date, d.timeIn, tz)
  const clockOutAt = localTimeToUtc(d.date, d.timeOut, tz)
  const durationMinutes = Math.round((Date.parse(clockOutAt) - Date.parse(clockInAt)) / 60_000)
  if (durationMinutes <= 0) return { success: false, error: 'La salida debe ser posterior a la entrada.' }
  if (durationMinutes > 16 * 60) {
    return { success: false, error: 'Un turno no puede durar más de 16 horas. Habla con tu manager.' }
  }

  // Sin solaparse con entries existentes (incluye turnos abiertos).
  const { data: overlap } = await supabase
    .from('time_entries')
    .select('id')
    .eq('employee_id', employee.id)
    .lt('clock_in_at', clockOutAt)
    .or(`clock_out_at.gt.${clockInAt},clock_out_at.is.null`)
    .limit(1)
  if (overlap && overlap.length > 0) {
    return { success: false, error: 'Ese horario se solapa con otro registro tuyo.' }
  }

  const policy = await fetchBreakPolicy(supabase, session.organizationId)
  const waived = !!d.noBreak && breakPolicyActive(policy)
  const { breakMinutes, billableMinutes } = applyAutoBreak(durationMinutes, policy, waived)

  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert({
      organization_id: session.organizationId,
      employee_id: employee.id,
      user_id: session.userId,
      clock_in_at: clockInAt,
      clock_out_at: clockOutAt,
      duration_minutes: durationMinutes,
      break_minutes: breakMinutes,
      billable_minutes: billableMinutes,
      break_waived: waived,
      status: 'pending',
      manual_kind: 'full',
      manual_reason: d.reason,
    })
    .select('id')
    .single()
  if (error || !entry) return { success: false, error: error?.message ?? 'No se pudo crear el registro.' }

  await notifyManagers(
    session.organizationId,
    session.userId,
    'Horas manuales por aprobar',
    `${employee.first_name} ${employee.last_name} reportó ${d.date} ${d.timeIn}–${d.timeOut} (${formatMinutes(billableMinutes)}): ${d.reason}`,
    `manual-${(entry as { id: string }).id}`,
  )

  revalidatePath('/(employee)', 'layout')
  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true }
}

const fixClockOutSchema = z.object({
  entryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  noBreak: z.boolean().optional(),
  reason: z.string().trim().min(3, 'Explica qué pasó.').max(500),
})

/**
 * Empleado corrige un clock-out olvidado: propone la hora real de salida de su
 * turno abierto. Queda 'pending' flageado 'clock_out' para el manager.
 */
export async function fixForgottenClockOut(
  input: z.input<typeof fixClockOutSchema>,
): Promise<ManualEntryResult> {
  const parsed = fixClockOutSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name, last_name, organization_id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!employee) return { success: false, error: 'No estás registrado como empleado.' }

  const { data: open } = await supabase
    .from('time_entries')
    .select('id, clock_in_at')
    .eq('id', d.entryId)
    .eq('employee_id', employee.id)
    .is('clock_out_at', null)
    .maybeSingle()
  if (!open) return { success: false, error: 'No se encontró tu turno abierto.' }

  const { data: org } = await supabase
    .from('organizations')
    .select('timezone')
    .eq('id', session.organizationId)
    .maybeSingle()
  const tz = (org as { timezone?: string } | null)?.timezone || 'America/New_York'

  const clockOutAt = localTimeToUtc(d.date, d.time, tz)
  const clockInMs = Date.parse((open as { clock_in_at: string }).clock_in_at)
  const durationMinutes = Math.round((Date.parse(clockOutAt) - clockInMs) / 60_000)
  if (durationMinutes <= 0) return { success: false, error: 'La salida debe ser posterior a la entrada.' }
  if (Date.parse(clockOutAt) > Date.now()) {
    return { success: false, error: 'La salida no puede estar en el futuro.' }
  }
  if (durationMinutes > 16 * 60) {
    return { success: false, error: 'Un turno no puede durar más de 16 horas. Habla con tu manager.' }
  }

  const policy = await fetchBreakPolicy(supabase, session.organizationId)
  const waived = !!d.noBreak && breakPolicyActive(policy)
  const { breakMinutes, billableMinutes } = applyAutoBreak(durationMinutes, policy, waived)

  const { error } = await supabase
    .from('time_entries')
    .update({
      clock_out_at: clockOutAt,
      duration_minutes: durationMinutes,
      break_minutes: breakMinutes,
      billable_minutes: billableMinutes,
      break_waived: waived,
      status: 'pending',
      manual_kind: 'clock_out',
      manual_reason: d.reason,
    })
    .eq('id', d.entryId)
  if (error) return { success: false, error: error.message }

  await notifyManagers(
    session.organizationId,
    session.userId,
    'Salida corregida por aprobar',
    `${employee.first_name} ${employee.last_name} corrigió su salida olvidada: ${d.date} ${d.time} (${formatMinutes(billableMinutes)}): ${d.reason}`,
    `fixout-${d.entryId}-${clockOutAt}`,
  )

  revalidatePath('/(employee)', 'layout')
  revalidatePath('/(app)/time-tracking', 'page')
  return { success: true }
}
