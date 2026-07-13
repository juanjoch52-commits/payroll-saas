import { describe, it, expect } from 'vitest'
import { rootOf, buildSettlements, type SubNode } from './tree'

// Árbol: Alpha (raíz) ← Beta ← Gamma ; Delta (raíz independiente)
const subs: SubNode[] = [
  { id: 'A', parent_id: null, name: 'Alpha Construction', sales_tax_pct: 0 },
  { id: 'B', parent_id: 'A', name: 'Beta Plumbing' },
  { id: 'C', parent_id: 'B', name: 'Gamma Crew' },
  { id: 'D', parent_id: null, name: 'Delta Electric', sales_tax_pct: 0 },
]
const byId = new Map(subs.map((s) => [s.id, s]))

describe('rootOf', () => {
  it('sube dos niveles hasta la raíz (Gamma → Beta → Alpha)', () => {
    expect(rootOf('C', byId)?.id).toBe('A')
  })
  it('una raíz es su propia raíz', () => {
    expect(rootOf('A', byId)?.id).toBe('A')
  })
  it('sub desconocido → null', () => {
    expect(rootOf('ZZZ', byId)).toBeNull()
  })
  it('no se cuelga con un ciclo en datos', () => {
    const cyc = new Map<string, SubNode>([
      ['X', { id: 'X', parent_id: 'Y', name: 'X' }],
      ['Y', { id: 'Y', parent_id: 'X', name: 'Y' }],
    ])
    expect(() => rootOf('X', cyc)).not.toThrow()
  })
})

describe('buildSettlements', () => {
  it('consolida el árbol en UN cheque, con bill=pay cuando no hay bill rate', () => {
    const s = buildSettlements(
      [
        { employeeId: 'e1', workerName: 'Ana', subcontractorId: 'B', hours: 40, payCents: 100000, billCents: 100000 },
        { employeeId: 'e2', workerName: 'Luis', subcontractorId: 'C', hours: 35, payCents: 87500, billCents: 87500 },
        { employeeId: 'e3', workerName: 'Mia', subcontractorId: 'D', hours: 10, payCents: 30000, billCents: 30000 },
      ],
      subs,
    )
    const alpha = s.find((x) => x.rootId === 'A')!
    expect(alpha.totalCents).toBe(187500)
    expect(alpha.marginCents).toBe(0)
    expect(alpha.lines).toHaveLength(2)
    expect(s.map((x) => x.rootId)).toEqual(['A', 'D'])
  })

  it('caso real: $37 propio, amigo bill $33 / pay $30 → margen $3/h + HST 13%', () => {
    // Juan es el sub raíz (HST 13% Ontario). 40h cada uno.
    const juanTree: SubNode[] = [{ id: 'J', parent_id: null, name: 'Juan Co', sales_tax_pct: 13 }]
    const s = buildSettlements(
      [
        // Juan: bill $37/h, se paga a sí mismo lo mismo → margen 0 en sus horas.
        { employeeId: 'j', workerName: 'Juan', subcontractorId: 'J', hours: 40, payCents: 148000, billCents: 148000 },
        // Amigo: bill $33/h = $1320; pay $30/h = $1200 → margen $120.
        { employeeId: 'f', workerName: 'Amigo', subcontractorId: 'J', hours: 40, payCents: 120000, billCents: 132000 },
      ],
      juanTree,
    )
    const g = s[0]
    expect(g.subtotalCents).toBe(280000) // 1480 + 1320
    expect(g.taxPct).toBe(13)
    expect(g.taxCents).toBe(36400) // 13% de 2800
    expect(g.totalCents).toBe(316400) // cheque con HST
    expect(g.payTotalCents).toBe(268000) // 1480 + 1200
    expect(g.marginCents).toBe(12000) // $120 (los $3/h × 40h del amigo)
    const amigo = g.lines.find((l) => l.employeeId === 'f')!
    expect(amigo.marginCents).toBe(12000)
  })

  it('items con sub desconocido se ignoran sin romper', () => {
    const s = buildSettlements(
      [{ employeeId: 'e9', workerName: 'X', subcontractorId: 'NOPE', hours: 1, payCents: 100, billCents: 100 }],
      subs,
    )
    expect(s).toHaveLength(0)
  })
})

// =============================================================================
// Auditoría de integridad del reporte de ingresos (no-duplicación, aislamiento)
// =============================================================================
describe('integridad de liquidaciones (reporte de ingresos)', () => {
  const items = [
    { employeeId: 'e1', workerName: 'Juan', subcontractorId: 'A', hours: 40, payCents: 148000, billCents: 148000 },
    { employeeId: 'e2', workerName: 'Amigo', subcontractorId: 'C', hours: 40, payCents: 120000, billCents: 132000 },
    { employeeId: 'e3', workerName: 'Delta W', subcontractorId: 'D', hours: 10, payCents: 30000, billCents: 35000 },
  ]

  it('un trabajador de un sub ANIDADO aparece UNA sola vez, y solo en su raíz', () => {
    const s = buildSettlements(items, subs)
    const apariciones = s.flatMap((x) => x.lines).filter((l) => l.employeeId === 'e2')
    expect(apariciones).toHaveLength(1)
    const alpha = s.find((x) => x.rootId === 'A')!
    const delta = s.find((x) => x.rootId === 'D')!
    expect(alpha.lines.some((l) => l.employeeId === 'e2')).toBe(true)
    expect(delta.lines.some((l) => l.employeeId === 'e2')).toBe(false)
  })

  it('dos contratistas raíz NO se mezclan (aislamiento total)', () => {
    const s = buildSettlements(items, subs)
    const alpha = s.find((x) => x.rootId === 'A')!
    const delta = s.find((x) => x.rootId === 'D')!
    expect(alpha.lines.map((l) => l.employeeId).sort()).toEqual(['e1', 'e2'])
    expect(delta.lines.map((l) => l.employeeId)).toEqual(['e3'])
    expect(alpha.subtotalCents).toBe(148000 + 132000)
    expect(delta.subtotalCents).toBe(35000)
  })

  it('las sumas SIEMPRE cuadran: Σ líneas = subtotal/payTotal/margen y total = subtotal + HST', () => {
    const s = buildSettlements(items, subs)
    for (const g of s) {
      expect(g.lines.reduce((a, l) => a + l.billCents, 0)).toBe(g.subtotalCents)
      expect(g.lines.reduce((a, l) => a + l.payCents, 0)).toBe(g.payTotalCents)
      expect(g.lines.reduce((a, l) => a + l.marginCents, 0)).toBe(g.marginCents)
      expect(g.totalCents).toBe(g.subtotalCents + g.taxCents)
    }
  })

  it('el HST se redondea UNA vez sobre el subtotal (sin acumular centavos por línea)', () => {
    const conHst: SubNode[] = [{ id: 'R', parent_id: null, name: 'Root', sales_tax_pct: 13 }]
    const s = buildSettlements(
      [
        { employeeId: 'x1', workerName: 'W1', subcontractorId: 'R', hours: 1, payCents: 333, billCents: 333 },
        { employeeId: 'x2', workerName: 'W2', subcontractorId: 'R', hours: 1, payCents: 333, billCents: 333 },
      ],
      conHst,
    )
    expect(s[0].taxCents).toBe(Math.round((666 * 13) / 100)) // 87, no 86 ni 88
    expect(s[0].totalCents).toBe(666 + 87)
  })
})
