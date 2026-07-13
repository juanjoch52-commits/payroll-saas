import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { isWithinGeofence } from '@/lib/geo'
import { applyAutoBreak } from '@/lib/time/breaks'

// =============================================================================
// Núcleo de clock in/out reutilizable (admin client). Lo usan los endpoints
// REST de la app móvil. Mantiene la misma lógica de geofence + foto + estados
// que el server action web (src/app/actions/time-tracking.ts).
// =============================================================================

type AdminClient = ReturnType<typeof createAdminClient>
type Worksite = { id?: string; latitude: number; longitude: number; radius_m: number }

export type ClockParams = {
  organizationId: string
  employeeId: string
  userId: string | null
  lat?: number
  lng?: number
  accuracy?: number
  worksiteId?: string | null
  photoBuffer?: Buffer | null
  kioskDeviceId?: string | null
  /** Clock out: el empleado declara que NO tomó su descanso (no se descuenta). */
  skipBreak?: boolean
}

export async function performClockIn(
  admin: AdminClient,
  p: ClockParams,
): Promise<{ ok: true; entryId: string; outsideGeofence: boolean } | { ok: false; error: string }> {
  const { data: open } = await admin
    .from('time_entries')
    .select('id')
    .eq('employee_id', p.employeeId)
    .is('clock_out_at', null)
    .maybeSingle()
  if (open) return { ok: false, error: 'Ya tienes un turno abierto.' }

  let outsideGeofence = false
  let worksiteId = p.worksiteId ?? null

  if (p.lat != null && p.lng != null) {
    if (!worksiteId) {
      const { data: worksites } = await admin
        .from('worksites')
        .select('id, latitude, longitude, radius_m')
        .eq('organization_id', p.organizationId)
        .eq('is_active', true)
      const list = (worksites ?? []) as Worksite[]
      const inside = list.find((w) =>
        isWithinGeofence(
          { lat: p.lat!, lng: p.lng! },
          { latitude: Number(w.latitude), longitude: Number(w.longitude), radius_m: w.radius_m },
        ),
      )
      if (inside?.id) worksiteId = inside.id
      else if (list.length > 0) outsideGeofence = true
    } else {
      const { data: w } = await admin
        .from('worksites')
        .select('latitude, longitude, radius_m')
        .eq('id', worksiteId)
        .maybeSingle()
      const ws = w as Worksite | null
      if (ws) {
        outsideGeofence = !isWithinGeofence(
          { lat: p.lat, lng: p.lng },
          { latitude: Number(ws.latitude), longitude: Number(ws.longitude), radius_m: ws.radius_m },
        )
      }
    }
  }

  const snapshotId = randomUUID()
  let photoPath: string | null = null
  if (p.photoBuffer) {
    photoPath = `${p.organizationId}/${p.employeeId}/${snapshotId}-in.jpg`
    await admin.storage
      .from('time-photos')
      .upload(photoPath, p.photoBuffer, { contentType: 'image/jpeg', upsert: false })
  }

  const { data: entry, error } = await admin
    .from('time_entries')
    .insert({
      organization_id: p.organizationId,
      employee_id: p.employeeId,
      user_id: p.userId,
      worksite_id: worksiteId,
      kiosk_device_id: p.kioskDeviceId ?? null,
      clock_in_lat: p.lat ?? null,
      clock_in_lng: p.lng ?? null,
      clock_in_accuracy_m: p.accuracy ?? null,
      clock_in_photo_path: photoPath,
      clock_in_outside_geofence: outsideGeofence,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !entry) {
    if (photoPath) await admin.storage.from('time-photos').remove([photoPath])
    return { ok: false, error: error?.message ?? 'No se pudo registrar la entrada.' }
  }
  return { ok: true, entryId: (entry as { id: string }).id, outsideGeofence }
}

export async function performClockOut(
  admin: AdminClient,
  p: ClockParams,
): Promise<
  | { ok: true; entryId: string; durationMinutes: number; outsideGeofence: boolean }
  | { ok: false; error: string }
> {
  const { data: open } = await admin
    .from('time_entries')
    .select('id, clock_in_at, worksite_id')
    .eq('employee_id', p.employeeId)
    .is('clock_out_at', null)
    .maybeSingle()
  if (!open) return { ok: false, error: 'No tienes un turno abierto.' }
  const entry = open as { id: string; clock_in_at: string; worksite_id: string | null }

  let outsideGeofence = false
  if (entry.worksite_id && p.lat != null && p.lng != null) {
    const { data: w } = await admin
      .from('worksites')
      .select('latitude, longitude, radius_m')
      .eq('id', entry.worksite_id)
      .maybeSingle()
    const ws = w as Worksite | null
    if (ws) {
      outsideGeofence = !isWithinGeofence(
        { lat: p.lat, lng: p.lng },
        { latitude: Number(ws.latitude), longitude: Number(ws.longitude), radius_m: ws.radius_m },
      )
    }
  }

  let photoPath: string | null = null
  if (p.photoBuffer) {
    photoPath = `${p.organizationId}/${p.employeeId}/${entry.id}-out.jpg`
    await admin.storage
      .from('time-photos')
      .upload(photoPath, p.photoBuffer, { contentType: 'image/jpeg', upsert: true })
  }

  const clockOutAt = new Date()
  const durationMinutes = Math.max(
    0,
    Math.round((clockOutAt.getTime() - new Date(entry.clock_in_at).getTime()) / 60_000),
  )

  // Descuento de almuerzo según la política de la org (waiveable desde la app).
  const { data: pol } = await admin
    .from('organizations')
    .select('break_auto_deduct_minutes, break_auto_deduct_threshold_minutes')
    .eq('id', p.organizationId)
    .maybeSingle()
  const polRow = pol as {
    break_auto_deduct_minutes?: number
    break_auto_deduct_threshold_minutes?: number
  } | null
  const policy = polRow
    ? {
        autoDeductMinutes: polRow.break_auto_deduct_minutes ?? 0,
        thresholdMinutes: polRow.break_auto_deduct_threshold_minutes ?? 0,
      }
    : null
  const waived = !!p.skipBreak && !!policy && policy.autoDeductMinutes > 0
  const { breakMinutes, billableMinutes } = applyAutoBreak(durationMinutes, policy, waived)

  const { error } = await admin
    .from('time_entries')
    .update({
      clock_out_at: clockOutAt.toISOString(),
      clock_out_lat: p.lat ?? null,
      clock_out_lng: p.lng ?? null,
      clock_out_accuracy_m: p.accuracy ?? null,
      clock_out_photo_path: photoPath,
      clock_out_outside_geofence: outsideGeofence,
      duration_minutes: durationMinutes,
      break_minutes: breakMinutes,
      billable_minutes: billableMinutes,
      break_waived: waived,
      status: 'pending',
    })
    .eq('id', entry.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, entryId: entry.id, durationMinutes, outsideGeofence }
}
