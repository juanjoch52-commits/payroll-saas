import { describe, it, expect } from 'vitest'
import { buildEfw2, type Efw2Submitter, type Efw2Employer, type Efw2Employee } from './efw2'

const submitter: Efw2Submitter = {
  ein: '12-3456789',
  name: 'MyJova Inc',
  address: '1 Market St',
  city: 'San Francisco',
  state: 'CA',
  zip: '94105',
}
const employer: Efw2Employer = { ein: '98-7654321', name: 'Acme Co', taxYear: 2026 }
const employees: Efw2Employee[] = [
  {
    ssn: '111-22-3333',
    firstName: 'John',
    lastName: 'Doe',
    wagesCents: 5000000,
    federalTaxCents: 600000,
    ssWagesCents: 5000000,
    ssTaxCents: 310000,
    medicareWagesCents: 5000000,
    medicareTaxCents: 72500,
  },
  {
    ssn: '444-55-6666',
    firstName: 'Jane',
    lastName: 'Roe',
    wagesCents: 3000000,
    federalTaxCents: 300000,
    ssWagesCents: 3000000,
    ssTaxCents: 186000,
    medicareWagesCents: 3000000,
    medicareTaxCents: 43500,
  },
]

// NO usar .trim(): el último registro (RF) termina en espacios de relleno y
// trim() los comería. Split por '\n' y descarta el salto final.
const file = buildEfw2(submitter, employer, employees)
const lines = file.split('\n').slice(0, -1)

describe('EFW2 file', () => {
  it('todos los registros miden 512 caracteres', () => {
    for (const l of lines) expect(l.length).toBe(512)
  })

  it('orden de registros RA, RE, RW, RW, RT, RF', () => {
    expect(lines.map((l) => l.slice(0, 2))).toEqual(['RA', 'RE', 'RW', 'RW', 'RT', 'RF'])
  })

  it('RA lleva el EIN del submitter (solo dígitos) y el nombre', () => {
    const ra = lines[0]
    expect(ra.slice(2, 11)).toBe('123456789')
    expect(ra.slice(39, 96).trim()).toBe('MYJOVA INC')
  })

  it('RE lleva tax year y EIN del empleador', () => {
    const re = lines[1]
    expect(re.slice(2, 6)).toBe('2026')
    expect(re.slice(7, 16)).toBe('987654321')
  })

  it('RW lleva los wages en centavos (campo 188-198, 11 dígitos)', () => {
    const rw = lines[2]
    expect(rw.slice(187, 198)).toBe('00005000000')
  })

  it('RT cuadra el conteo y los totales', () => {
    const rt = lines[4]
    expect(parseInt(rt.slice(2, 9), 10)).toBe(2) // número de RW
    expect(parseInt(rt.slice(9, 24), 10)).toBe(8000000) // wages: 5,000,000 + 3,000,000
    expect(parseInt(rt.slice(24, 39), 10)).toBe(900000) // federal
    expect(parseInt(rt.slice(39, 54), 10)).toBe(8000000) // ss wages
    expect(parseInt(rt.slice(84, 99), 10)).toBe(116000) // medicare tax: 72500 + 43500
  })

  it('RF lleva el total de RW del archivo', () => {
    const rf = lines[5]
    expect(parseInt(rf.slice(7, 16), 10)).toBe(2)
  })

  it('archivo sin empleados: RA, RE, RT(0), RF(0)', () => {
    const empty = buildEfw2(submitter, employer, []).split('\n').slice(0, -1)
    expect(empty.map((l) => l.slice(0, 2))).toEqual(['RA', 'RE', 'RT', 'RF'])
    for (const l of empty) expect(l.length).toBe(512)
    expect(parseInt(empty[2].slice(2, 9), 10)).toBe(0)
  })
})
