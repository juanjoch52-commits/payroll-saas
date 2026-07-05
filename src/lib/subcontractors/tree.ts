// =============================================================================
// Subcontratistas — árbol y settlement (puro, testeable)
// =============================================================================
// rootOf: sube por parent_id hasta el sub RAÍZ (el que recibe el cheque).
// buildSettlement: agrupa items de nómina por sub raíz → un cheque por raíz
// con desglose por trabajador (horas + bruto). Protegido contra ciclos.
// =============================================================================

export type SubNode = { id: string; parent_id: string | null; name: string }

export type SettlementLine = {
  employeeId: string
  workerName: string
  subName: string // sub directo al que pertenece el trabajador
  hours: number | null
  grossCents: number
}

export type Settlement = {
  rootId: string
  rootName: string
  totalCents: number
  lines: SettlementLine[]
}

/** Sub raíz de la cadena (con tope de saltos por si hay un ciclo en datos). */
export function rootOf(subId: string, subsById: Map<string, SubNode>): SubNode | null {
  let current = subsById.get(subId) ?? null
  let hops = 0
  while (current && current.parent_id && hops < 20) {
    const parent = subsById.get(current.parent_id)
    if (!parent || parent.id === current.id) break
    current = parent
    hops++
  }
  return current
}

export function buildSettlements(
  items: {
    employeeId: string
    workerName: string
    subcontractorId: string
    hours: number | null
    grossCents: number
  }[],
  subs: SubNode[],
): Settlement[] {
  const byId = new Map(subs.map((s) => [s.id, s]))
  const groups = new Map<string, Settlement>()

  for (const it of items) {
    const direct = byId.get(it.subcontractorId)
    const root = rootOf(it.subcontractorId, byId)
    if (!root) continue
    const g =
      groups.get(root.id) ??
      ({ rootId: root.id, rootName: root.name, totalCents: 0, lines: [] } satisfies Settlement)
    g.totalCents += it.grossCents
    g.lines.push({
      employeeId: it.employeeId,
      workerName: it.workerName,
      subName: direct?.name ?? root.name,
      hours: it.hours,
      grossCents: it.grossCents,
    })
    groups.set(root.id, g)
  }

  return [...groups.values()].sort((a, b) => b.totalCents - a.totalCents)
}
