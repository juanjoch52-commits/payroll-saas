import { describe, it, expect } from 'vitest'
import { buildNachaFile, type NachaCompany, type NachaEntry } from './nacha'

const company: NachaCompany = {
  companyName: 'Acme Co',
  companyId: '1234567890',
  originDfi: '021000021',
  destinationRouting: '021000021',
  destinationName: 'Big Bank',
  originName: 'Acme Co',
  entryDescription: 'PAYROLL',
}
const entries: NachaEntry[] = [
  { routingNumber: '011401533', accountNumber: '12345678', accountType: 'checking', amountCents: 120000, name: 'John Doe' },
  { routingNumber: '091000019', accountNumber: '987654', accountType: 'savings', amountCents: 85000, name: 'Jane Roe' },
]
const file = buildNachaFile(company, entries, { effectiveDate: '260605', fileDate: '260603', fileTime: '1200' })
const lines = file.trim().split('\n')

describe('NACHA file', () => {
  it('todos los registros miden 94 caracteres', () => {
    for (const l of lines) expect(l.length).toBe(94)
  })
  it('el total de registros es múltiplo de 10', () => {
    expect(lines.length % 10).toBe(0)
  })
  it('tipos de registro en orden 1,5,6,6,8,9', () => {
    expect(lines.map((l) => l[0]).slice(0, 6).join('')).toBe('156689')
  })
  it('el total de créditos del file control cuadra', () => {
    const fc = lines[5]
    expect(parseInt(fc.slice(43, 55), 10)).toBe(205000)
  })
  it('el entry hash suma los routings (8 dígitos)', () => {
    // 01140153 + 09100001 = 10240154
    const bc = lines[4]
    expect(parseInt(bc.slice(10, 20), 10)).toBe(10240154)
  })
})
