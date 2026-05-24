// =============================================================================
// Canada payroll calc (federal + provincial)
// =============================================================================
import { calcCAFederalTax, calcCPP, calcEI } from './federal-2026'
import { calcOntarioTax } from './provinces/on'
import { calcQuebecTax, calcQPP, calcQPIP } from './provinces/qc'
import { calcBritishColumbiaTax } from './provinces/bc'
import { calcAlbertaTax } from './provinces/ab'

export type CAProvince = 'ON' | 'QC' | 'BC' | 'AB'

export type CAPayrollInput = {
  grossCents: number
  periodsPerYear: number
  province: CAProvince
  ytdPensionableCents: number
  ytdInsurableCents: number
  td1FederalCents?: number
  td1ProvincialCents?: number
}

export type CAPayrollResult = {
  federalTaxCents: number
  provincialTaxCents: number
  cppCents: number
  eiCents: number
  qpipCents: number
  totalDeductionsCents: number
  netCents: number
}

export function calcCAPayroll(input: CAPayrollInput): CAPayrollResult {
  const isQc = input.province === 'QC'

  const federalTaxCents = calcCAFederalTax({
    grossCents: input.grossCents,
    periodsPerYear: input.periodsPerYear,
    ytdGrossCents: input.ytdPensionableCents,
    td1Cents: input.td1FederalCents,
    isQuebec: isQc,
  })

  let provincialTaxCents = 0
  switch (input.province) {
    case 'ON':
      provincialTaxCents = calcOntarioTax({
        grossCents: input.grossCents,
        periodsPerYear: input.periodsPerYear,
        td1ProvincialCents: input.td1ProvincialCents,
      })
      break
    case 'QC':
      provincialTaxCents = calcQuebecTax({
        grossCents: input.grossCents,
        periodsPerYear: input.periodsPerYear,
        td1ProvincialCents: input.td1ProvincialCents,
      })
      break
    case 'BC':
      provincialTaxCents = calcBritishColumbiaTax({
        grossCents: input.grossCents,
        periodsPerYear: input.periodsPerYear,
        td1ProvincialCents: input.td1ProvincialCents,
      })
      break
    case 'AB':
      provincialTaxCents = calcAlbertaTax({
        grossCents: input.grossCents,
        periodsPerYear: input.periodsPerYear,
        td1ProvincialCents: input.td1ProvincialCents,
      })
      break
  }

  const cppCents = isQc
    ? calcQPP(input.grossCents, input.ytdPensionableCents)
    : calcCPP(input.grossCents, input.ytdPensionableCents)

  const eiCents = calcEI(input.grossCents, input.ytdInsurableCents, isQc)
  const qpipCents = isQc ? calcQPIP(input.grossCents, input.ytdInsurableCents) : 0

  const totalDeductionsCents = federalTaxCents + provincialTaxCents + cppCents + eiCents + qpipCents
  const netCents = input.grossCents - totalDeductionsCents

  return {
    federalTaxCents,
    provincialTaxCents,
    cppCents,
    eiCents,
    qpipCents,
    totalDeductionsCents,
    netCents,
  }
}
