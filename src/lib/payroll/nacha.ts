// =============================================================================
// MyJova — Generador de archivo NACHA (ACH) para depósito directo de nómina.
// =============================================================================
// Construye un lote PPD de SOLO CRÉDITOS (pagos a empleados). Registros de 94
// caracteres, bloqueados a múltiplos de 10. Es el formato estándar que los
// bancos de EE. UU. aceptan para subir nóminas.
//
// IMPORTANTE: valida el archivo con tu banco antes de usarlo en producción —
// algunos bancos tienen requisitos específicos (immediate origin, company id).
// Función PURA (sin I/O) → testeable.
// =============================================================================

export type NachaCompany = {
  companyName: string
  companyId: string // 10 chars (a menudo '1' + EIN de 9 dígitos)
  originDfi: string // routing del banco originador (ODFI), 9 dígitos
  destinationRouting: string // routing del banco que recibe el archivo, 9 dígitos
  destinationName: string
  originName: string
  entryDescription?: string // ej. 'PAYROLL'
}

export type NachaEntry = {
  routingNumber: string // RDFI, 9 dígitos (con dígito verificador)
  accountNumber: string
  accountType: 'checking' | 'savings'
  amountCents: number
  name: string
  idNumber?: string
}

export type NachaOptions = {
  effectiveDate: string // YYMMDD
  fileDate: string // YYMMDD
  fileTime: string // HHMM
}

const digits = (s: string) => (s ?? '').replace(/\D/g, '')
function alpha(s: string, len: number): string {
  return (s ?? '').toUpperCase().slice(0, len).padEnd(len, ' ')
}
function numField(n: number | string, len: number): string {
  return digits(String(n)).slice(-len).padStart(len, '0')
}

export function buildNachaFile(
  company: NachaCompany,
  entries: NachaEntry[],
  opts: NachaOptions,
): string {
  const odfi8 = digits(company.originDfi).slice(0, 8).padStart(8, '0')
  const dest = digits(company.destinationRouting).slice(0, 9).padStart(9, '0')
  const desc = (company.entryDescription || 'PAYROLL').toUpperCase()

  // --- File Header (1) ---
  const fileHeader =
    '1' +
    '01' +
    ' ' + dest + // immediate destination (10: espacio + 9)
    ' ' + numField(company.originDfi, 9) + // immediate origin (10: espacio + 9)
    opts.fileDate +
    opts.fileTime +
    'A' +
    '094' +
    '10' +
    '1' +
    alpha(company.destinationName, 23) +
    alpha(company.originName, 23) +
    ' '.repeat(8)

  // --- Batch Header (5) ---
  const batchHeader =
    '5' +
    '220' + // service class: credits only
    alpha(company.companyName, 16) +
    ' '.repeat(20) + // discretionary
    alpha(company.companyId, 10) +
    'PPD' +
    alpha(desc, 10) +
    opts.effectiveDate + // descriptive date
    opts.effectiveDate + // effective entry date
    ' '.repeat(3) + // settlement (ACH fills)
    '1' + // originator status
    odfi8 +
    '0000001' // batch number

  // --- Entry Detail (6) ---
  let entryHash = 0
  let creditTotal = 0
  const detail = entries.map((e, i) => {
    const rdfi = digits(e.routingNumber).padStart(9, '0')
    const rdfi8 = rdfi.slice(0, 8)
    const checkDigit = rdfi.slice(8, 9)
    entryHash += parseInt(rdfi8, 10) || 0
    creditTotal += Math.max(0, Math.round(e.amountCents))
    const txCode = e.accountType === 'savings' ? '32' : '22' // credit
    const trace = odfi8 + numField(i + 1, 7)
    return (
      '6' +
      txCode +
      rdfi8 +
      checkDigit +
      alpha(e.accountNumber, 17) +
      numField(e.amountCents, 10) +
      alpha(e.idNumber ?? '', 15) +
      alpha(e.name, 22) +
      '  ' + // discretionary
      '0' + // addenda indicator
      trace
    )
  })

  const hash10 = String(entryHash % 10_000_000_000).padStart(10, '0')

  // --- Batch Control (8) ---
  const batchControl =
    '8' +
    '220' +
    numField(entries.length, 6) +
    hash10 +
    numField(0, 12) + // total debit
    numField(creditTotal, 12) +
    alpha(company.companyId, 10) +
    ' '.repeat(19) + // MAC
    ' '.repeat(6) + // reserved
    odfi8 +
    '0000001'

  // --- File Control (9) ---
  // Registros: FileHeader + BatchHeader + details + BatchControl + FileControl,
  // luego relleno '9' hasta múltiplo de 10 (block count = total/10).
  const records = [fileHeader, batchHeader, ...detail, batchControl]
  const blockCount = Math.ceil((records.length + 1) / 10)

  const fileControl =
    '9' +
    numField(1, 6) + // batch count
    numField(blockCount, 6) +
    numField(entries.length, 8) +
    hash10 +
    numField(0, 12) +
    numField(creditTotal, 12) +
    ' '.repeat(39)

  records.push(fileControl)

  // Relleno con registros '9' hasta múltiplo de 10.
  while (records.length % 10 !== 0) records.push('9'.repeat(94))

  return records.join('\n') + '\n'
}
