'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { isWithinGeofence } from '@/lib/geo'

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
})

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

  // 4) Calcular duración
  const clockOutAt = new Date()
  const clockInAt = new Date(openEntry.clock_in_at)
  const durationMinutes = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000))
  const billableMinutes = durationMinutes  // sin breaks por defecto; manager puede ajustar

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
      billable_minutes: billableMinutes,
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
