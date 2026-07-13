// =============================================================================
// Reparto de pool de propinas — puro (testeable)
// =============================================================================
// Distribuye `totalCents` entre los participantes proporcionalmente a su peso
// (p.ej. minutos trabajados). Reglas:
//   - Solo participan los de peso > 0. Si NINGUNO tiene peso (>0), se reparte por
//     igual entre todos (fallback equitativo).
//   - El último recibe el remanente para que la suma cuadre EXACTA con totalCents
//     (evita perder/ganar centavos por redondeo).
// =============================================================================

export type TipParticipant = { employeeId: string; weightUnits: number }
export type TipAllocation = { employeeId: string; amountCents: number }

export function distributeTipPool(
  totalCents: number,
  participants: TipParticipant[],
): TipAllocation[] {
  const positive = participants.filter((p) => p.weightUnits > 0)
  const pool = positive.length > 0 ? positive : participants.map((p) => ({ ...p, weightUnits: 1 }))
  const sum = pool.reduce((a, p) => a + p.weightUnits, 0)
  if (pool.length === 0 || sum <= 0 || totalCents <= 0) return []

  const out: TipAllocation[] = []
  let allocated = 0
  pool.forEach((p, i) => {
    let share =
      i === pool.length - 1 ? totalCents - allocated : Math.round((totalCents * p.weightUnits) / sum)
    if (share < 0) share = 0
    allocated += share
    out.push({ employeeId: p.employeeId, amountCents: share })
  })
  return out
}
