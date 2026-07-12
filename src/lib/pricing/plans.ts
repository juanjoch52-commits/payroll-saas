/**
 * Precios de los planes — FUENTE ÚNICA para la landing y el ROI calculator.
 *
 * Modelo de cobro (aprobado 2026-07-12): BASE mensual + precio POR TRABAJADOR
 * ACTIVO (status = 'active'). Sin topes de empleados.
 *
 * ⚠️ PLACEHOLDER — al ajustar estos números hay que cambiar TRES sitios:
 *   1. Este archivo (landing + ROI).
 *   2. La migración/tabla `plans` (base_price_cents / per_worker_price_cents)
 *      — el dashboard de billing lee de la DB.
 *   3. Los precios reales en Stripe (STRIPE_PRICE_<PLAN>_BASE / _SEAT).
 *
 * La app dentro del tenant NUNCA lee de aquí (lee la tabla `plans`); esto es
 * solo para páginas de marketing que renderizan sin sesión ni DB.
 */

export type PlanCode = 'essential' | 'advanced' | 'premium'

export const PLAN_PRICING_USD: Record<PlanCode, { base: number; perWorker: number }> = {
  essential: { base: 29, perWorker: 5 },
  advanced: { base: 59, perWorker: 7 },
  premium: { base: 99, perWorker: 10 },
}

/** Costo mensual total en USD para N trabajadores activos. */
export function monthlyTotalUsd(code: PlanCode, activeWorkers: number): number {
  const p = PLAN_PRICING_USD[code]
  return p.base + p.perWorker * Math.max(0, activeWorkers)
}

/**
 * Costo mensual total en centavos a partir de una fila de `plans` de la DB.
 * Usado por la página de billing del tenant y el estimado de MRR del admin.
 */
export function monthlyTotalCents(
  basePriceCents: number,
  perWorkerPriceCents: number,
  activeWorkers: number,
): number {
  return basePriceCents + perWorkerPriceCents * Math.max(0, activeWorkers)
}

/**
 * Tier "típico" para un tamaño de equipo — solo para el ROI calculator de la
 * landing (los caps ya no existen; esto aproxima qué plan suele necesitar
 * cada tamaño por las features que usa).
 */
export function typicalPlanForTeamSize(workers: number): PlanCode {
  if (workers <= 10) return 'essential'
  if (workers <= 50) return 'advanced'
  return 'premium'
}
