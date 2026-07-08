// =============================================================================
// Subcontratistas — árbol y settlement (puro, testeable)
// =============================================================================
// rootOf: sube por parent_id hasta el sub RAÍZ (el que recibe el cheque).
// buildSettlements: agrupa items de nómina por sub raíz. Cada línea distingue:
//   payCents  → lo que el sub le paga al trabajador (pay rate)
//   billCents → lo que se factura al contratista por ese trabajador (bill rate)
//   margen    = bill − pay (lo que el sub se queda por ese trabajador)
// El cheque = subtotal facturado + impuesto de venta (HST/GST) del sub raíz.
// =============================================================================

export type SubNode = {
  id: string
  parent_id: string | null
  name: string
  /** % de HST/GST a agregar sobre el subtotal (solo se lee del sub RAÍZ). */
  sales_tax_pct?: number | null
}

export type SettlementLine = {
  employeeId: string
  workerName: string
  subName: string // sub directo al que pertenece el trabajador
  hours: number | null
  payCents: number // lo que el sub paga al trabajador
  billCents: number // lo que se factura al contratista
  marginCents: number // bill − pay
}

export type Settlement = {
  rootId: string
  rootName: string
  subtotalCents: number // Σ bill
  taxPct: number
  taxCents: number
  totalCents: number // subtotal + tax → monto del cheque
  payTotalCents: number // Σ pay (lo que el sub reparte a su gente)
  marginCents: number // subtotal − payTotal (margen del árbol)
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
    /** Bruto de nómina del trabajador (pay rate). */
    payCents: number
    /** Facturado al contratista; si no hay bill rate, pásalo igual a payCents. */
    billCents: number
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
      ({
        rootId: root.id,
        rootName: root.name,
        subtotalCents: 0,
        taxPct: Number(root.sales_tax_pct ?? 0),
        taxCents: 0,
        totalCents: 0,
        payTotalCents: 0,
        marginCents: 0,
        lines: [],
      } satisfies Settlement)
    g.subtotalCents += it.billCents
    g.payTotalCents += it.payCents
    g.lines.push({
      employeeId: it.employeeId,
      workerName: it.workerName,
      subName: direct?.name ?? root.name,
      hours: it.hours,
      payCents: it.payCents,
      billCents: it.billCents,
      marginCents: it.billCents - it.payCents,
    })
    groups.set(root.id, g)
  }

  for (const g of groups.values()) {
    g.taxCents = Math.round((g.subtotalCents * g.taxPct) / 100)
    g.totalCents = g.subtotalCents + g.taxCents
    g.marginCents = g.subtotalCents - g.payTotalCents
  }

  return [...groups.values()].sort((a, b) => b.totalCents - a.totalCents)
}
