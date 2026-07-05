import { describe, it, expect } from 'vitest'
import { rootOf, buildSettlements, type SubNode } from './tree'

// Árbol: Alpha (raíz) ← Beta ← Gamma ; Delta (raíz independiente)
const subs: SubNode[] = [
  { id: 'A', parent_id: null, name: 'Alpha Construction' },
  { id: 'B', parent_id: 'A', name: 'Beta Plumbing' },
  { id: 'C', parent_id: 'B', name: 'Gamma Crew' },
  { id: 'D', parent_id: null, name: 'Delta Electric' },
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
  const items = [
    { employeeId: 'e1', workerName: 'Ana', subcontractorId: 'B', hours: 40, grossCents: 100000 },
    { employeeId: 'e2', workerName: 'Luis', subcontractorId: 'C', hours: 35, grossCents: 87500 },
    { employeeId: 'e3', workerName: 'Mia', subcontractorId: 'D', hours: 10, grossCents: 30000 },
  ]

  it('consolida el árbol completo en UN cheque a la raíz', () => {
    const s = buildSettlements(items, subs)
    const alpha = s.find((x) => x.rootId === 'A')!
    // Ana (Beta) + Luis (Gamma, sub de Beta) → mismo cheque a Alpha
    expect(alpha.totalCents).toBe(187500)
    expect(alpha.lines).toHaveLength(2)
    expect(alpha.lines.map((l) => l.subName).sort()).toEqual(['Beta Plumbing', 'Gamma Crew'])
  })

  it('raíces independientes generan cheques separados, ordenados por monto', () => {
    const s = buildSettlements(items, subs)
    expect(s.map((x) => x.rootId)).toEqual(['A', 'D'])
    expect(s[1].totalCents).toBe(30000)
  })

  it('items con sub desconocido se ignoran sin romper', () => {
    const s = buildSettlements(
      [{ employeeId: 'e9', workerName: 'X', subcontractorId: 'NOPE', hours: 1, grossCents: 100 }],
      subs,
    )
    expect(s).toHaveLength(0)
  })
})
