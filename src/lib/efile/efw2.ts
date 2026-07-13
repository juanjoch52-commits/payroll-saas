// =============================================================================
// SSA EFW2 — W-2 electrónico (fixed-width, 512 bytes/registro)
// =============================================================================
// Construye un archivo EFW2 (SSA "Specifications for Filing Forms W-2
// Electronically"). Registros de 512 caracteres:
//   RA  Submitter   (quién transmite)
//   RE  Employer    (empleador / tax year)
//   RW  Wage        (uno por empleado)
//   RT  Total       (totales de los RW de este RE)
//   RF  Final       (cierre del archivo)
//
// Función PURA (sin I/O) → testeable, igual que nacha.ts. Posiciones según la
// spec EFW2; importes en CENTAVOS, justificados a la derecha con ceros, sin
// punto decimal. Texto en mayúsculas, justificado a la izquierda con espacios.
//
// IMPORTANTE: valida con AccuWage (SSA) antes de transmitir en producción.
// =============================================================================

export type Efw2Submitter = {
  ein: string
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

export type Efw2Employer = {
  ein: string
  name: string
  taxYear: number
}

export type Efw2Employee = {
  ssn: string
  firstName: string
  lastName: string
  wagesCents: number
  federalTaxCents: number
  ssWagesCents: number
  ssTaxCents: number
  medicareWagesCents: number
  medicareTaxCents: number
}

const RECORD_LEN = 512
const digits = (s: string) => (s ?? '').replace(/\D/g, '')

/** Coloca un campo en el buffer (start es 1-based, como la spec). */
function put(buf: string[], start1: number, len: number, raw: string | number, numeric = false): void {
  const s = numeric
    ? digits(String(raw)).slice(-len).padStart(len, '0')
    : String(raw ?? '').toUpperCase().slice(0, len).padEnd(len, ' ')
  for (let i = 0; i < len; i++) buf[start1 - 1 + i] = s[i] ?? ' '
}

function blank(): string[] {
  return new Array(RECORD_LEN).fill(' ')
}

export function buildEfw2(
  submitter: Efw2Submitter,
  employer: Efw2Employer,
  employees: Efw2Employee[],
): string {
  // --- RA Submitter ---
  const ra = blank()
  put(ra, 1, 2, 'RA')
  put(ra, 3, 9, submitter.ein, true)
  put(ra, 40, 57, submitter.name)
  put(ra, 97, 22, submitter.address ?? '')
  put(ra, 141, 22, submitter.city ?? '')
  put(ra, 163, 2, submitter.state ?? '')
  put(ra, 165, 5, submitter.zip ?? '', true)

  // --- RE Employer ---
  const re = blank()
  put(re, 1, 2, 'RE')
  put(re, 3, 4, employer.taxYear, true)
  put(re, 8, 9, employer.ein, true)
  put(re, 40, 57, employer.name)

  // --- RW Wage (uno por empleado) ---
  let totWages = 0
  let totFederal = 0
  let totSsWages = 0
  let totSsTax = 0
  let totMedWages = 0
  let totMedTax = 0

  const rws = employees.map((e) => {
    const rw = blank()
    put(rw, 1, 2, 'RW')
    put(rw, 3, 9, e.ssn, true)
    put(rw, 12, 15, e.firstName)
    put(rw, 42, 20, e.lastName)
    put(rw, 188, 11, e.wagesCents, true)
    put(rw, 199, 11, e.federalTaxCents, true)
    put(rw, 210, 11, e.ssWagesCents, true)
    put(rw, 221, 11, e.ssTaxCents, true)
    put(rw, 232, 11, e.medicareWagesCents, true)
    put(rw, 243, 11, e.medicareTaxCents, true)

    totWages += e.wagesCents
    totFederal += e.federalTaxCents
    totSsWages += e.ssWagesCents
    totSsTax += e.ssTaxCents
    totMedWages += e.medicareWagesCents
    totMedTax += e.medicareTaxCents
    return rw.join('')
  })

  // --- RT Total ---
  const rt = blank()
  put(rt, 1, 2, 'RT')
  put(rt, 3, 7, employees.length, true)
  put(rt, 10, 15, totWages, true)
  put(rt, 25, 15, totFederal, true)
  put(rt, 40, 15, totSsWages, true)
  put(rt, 55, 15, totSsTax, true)
  put(rt, 70, 15, totMedWages, true)
  put(rt, 85, 15, totMedTax, true)

  // --- RF Final ---
  const rf = blank()
  put(rf, 1, 2, 'RF')
  put(rf, 8, 9, employees.length, true)

  return [ra.join(''), re.join(''), ...rws, rt.join(''), rf.join('')].join('\n') + '\n'
}
