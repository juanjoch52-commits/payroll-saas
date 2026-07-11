// =============================================================================
// Descuento automático de descanso no pagado (puro)
// =============================================================================
// Regla de la org: descontar `autoDeductMinutes` (ej. 30m de almuerzo) cuando
// el turno alcanza `thresholdMinutes` (ej. 6h). Turnos cortos (medio día) no
// descuentan; el empleado puede declarar "no tomé almuerzo" (waived) y el
// turno queda flageado para revisión del manager.
// =============================================================================

export type BreakPolicy = {
  autoDeductMinutes: number
  thresholdMinutes: number
}

export function breakPolicyActive(policy: BreakPolicy | null | undefined): boolean {
  return !!policy && policy.autoDeductMinutes > 0
}

/**
 * Aplica la política al turno: devuelve break y minutos facturables.
 * - Política inactiva, turno bajo el umbral o waiver → sin descuento.
 * - El descuento nunca deja el turno en negativo.
 */
export function applyAutoBreak(
  durationMinutes: number,
  policy: BreakPolicy | null | undefined,
  waived = false,
): { breakMinutes: number; billableMinutes: number } {
  const duration = Math.max(0, Math.round(durationMinutes))
  if (!breakPolicyActive(policy) || waived || duration < policy!.thresholdMinutes) {
    return { breakMinutes: 0, billableMinutes: duration }
  }
  const breakMinutes = Math.min(policy!.autoDeductMinutes, duration)
  return { breakMinutes, billableMinutes: duration - breakMinutes }
}
