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

describe('NACHA — casos límite', () => {
  const opts = { effectiveDate: '260605', fileDate: '260603', fileTime: '1200' }

  it('archivo sin entries: estructura válida y contadores en 0', () => {
    const f = buildNachaFile(company, [], opts)
    const ls = f.trim().split('\n')
    // 1(file) + 5(batch) + 8(batch ctrl) + 9(file ctrl) = 4 → relleno a 10.
    expect(ls.length).toBe(10)
    for (const l of ls) expect(l.length).toBe(94)
    expect(ls.map((l) => l[0]).slice(0, 4).join('')).toBe('1589')
    const fc = ls[3]
    expect(parseInt(fc.slice(13, 21), 10)).toBe(0) // entry/addenda count
    expect(parseInt(fc.slice(31, 43), 10)).toBe(0) // total debits
    expect(parseInt(fc.slice(43, 55), 10)).toBe(0) // total credits
  })

  it('blocking: 9 entries → relleno a múltiplo de 10 y todos 94 chars', () => {
    const many: NachaEntry[] = Array.from({ length: 9 }, (_, i) => ({
      routingNumber: '021000021',
      accountNumber: `acct${i}`,
      accountType: 'checking',
      amountCents: 1000 * (i + 1),
      name: `Emp ${i}`,
    }))
    const f = buildNachaFile(company, many, opts)
    const ls = f.trim().split('\n')
    // 1 + 1 + 9 + 1 + 1 = 13 → relleno a 20.
    expect(ls.length).toBe(20)
    expect(ls.length % 10).toBe(0)
    for (const l of ls) expect(l.length).toBe(94)
    // file control en índice 12: 1 + 1 + 9 entries + batch control = 12.
    expect(ls[12][0]).toBe('9')
    expect(parseInt(ls[12].slice(13, 21), 10)).toBe(9) // entry count
    // créditos = 1000*(1+..+9) = 45000
    expect(parseInt(ls[12].slice(43, 55), 10)).toBe(45000)
    // resto deben ser registros de relleno '9'*94
    for (let i = 13; i < 20; i++) expect(ls[i]).toBe('9'.repeat(94))
  })

  it('trunca accountNumber a 17 y name a 22', () => {
    const f = buildNachaFile(
      company,
      [
        {
          routingNumber: '021000021',
          accountNumber: '123456789012345678901234567890',
          accountType: 'checking',
          amountCents: 5000,
          name: 'A really really long employee name here',
        },
      ],
      opts,
    )
    const detail = f.trim().split('\n')[2]
    expect(detail.slice(12, 29)).toBe('12345678901234567') // 17 chars
    expect(detail.slice(54, 76)).toBe('A REALLY REALLY LONG E') // 22 chars, mayúsculas
  })

  it('formatea el importe a 10 dígitos con padding de ceros', () => {
    const f = buildNachaFile(
      company,
      [
        {
          routingNumber: '021000021',
          accountNumber: '1',
          accountType: 'checking',
          amountCents: 123456789,
          name: 'X',
        },
      ],
      opts,
    )
    const detail = f.trim().split('\n')[2]
    expect(detail.slice(29, 39)).toBe('0123456789')
  })

  it('cuenta de ahorro usa tx code 32 y cheque 22', () => {
    const f = buildNachaFile(
      company,
      [
        { routingNumber: '021000021', accountNumber: '1', accountType: 'savings', amountCents: 100, name: 'S' },
        { routingNumber: '021000021', accountNumber: '2', accountType: 'checking', amountCents: 100, name: 'C' },
      ],
      opts,
    )
    const ls = f.trim().split('\n')
    expect(ls[2].slice(1, 3)).toBe('32')
    expect(ls[3].slice(1, 3)).toBe('22')
  })
})
