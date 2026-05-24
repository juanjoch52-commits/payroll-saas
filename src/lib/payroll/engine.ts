// =============================================================================
// MyJova — Motor de cálculo de nómina (puro, sin I/O)
// =============================================================================
// Este archivo NO hace ninguna llamada a BD. Recibe datos y devuelve el cálculo
// completo. Esto permite testearlo con vitest sin necesidad de Supabase.
//
// Las funciones de impuestos federales US viven en `./us/federal-2026.ts`.
// =============================================================================

import type { PaySchemeConfig } from '@/lib/validators/employee'
import {
  calcUSFederalWithholding,
  calcUSSocialSecurity,
  calcUSMedicare,
  calcUSEmployerFUTA,
  type FilingStatus,
} from './us/federal-2026'

// -----------------------------------------------------------------------------
// Tipos públicos
// -----------------------------------------------------------------------------

export type PayrollInput = {
  scheme: PaySchemeConfig
  hoursWorked?: number
  overtimeHours?: number
  daysWorked?: number
  salesAmountCents?: number
  // Datos del empleado necesarios para impuestos
  filingStatus: FilingStatus
  w4Dependents: number
  // Para FICA acumulado YTD (Medicare additional 0.9% sobre >$200k)
  ytdGrossCents?: number
  // Periodos por año del scheme — necesario para anualizar el gross y mirar brackets.
  periodsPerYear: number
}

export type PayrollComponent = {
  type: 'earning' | 'deduction' | 'tax' | 'employer_tax'
  code: string
  label: string
  amountCents: number
}

export type PayrollCalculation = {
  grossCents: number
  netCents: number
  federalTaxCents: number
  socialSecurityCents: number
  medicareCents: number
  stateTaxCents: number
  otherDeductionsCents: number
  employerSocialSecurityCents: number
  employerMedicareCents: number
  employerFUTACents: number
  components: PayrollComponent[]
  breakdown: Record<string, unknown>
}

// -----------------------------------------------------------------------------
// 1) Cálculo del GROSS según el pay scheme
// -----------------------------------------------------------------------------

function calcGross(input: PayrollInput): {
  grossCents: number
  components: PayrollComponent[]
} {
  const { scheme } = input
  const components: PayrollComponent[] = []

  switch (scheme.type) {
    case 'hourly': {
      const regularHours = Math.min(input.hoursWorked ?? 0, scheme.overtimeThresholdHours)
      const overtimeHours = Math.max(
        (input.hoursWorked ?? 0) - scheme.overtimeThresholdHours,
        0,
      ) + (input.overtimeHours ?? 0)

      const regular = Math.round(regularHours * scheme.rateCents)
      const overtime = Math.round(
        overtimeHours * scheme.rateCents * scheme.overtimeMultiplier,
      )

      if (regular > 0) {
        components.push({
          type: 'earning',
          code: 'regular_hours',
          label: `Regular hours (${regularHours}h × ${(scheme.rateCents / 100).toFixed(2)})`,
          amountCents: regular,
        })
      }
      if (overtime > 0) {
        components.push({
          type: 'earning',
          code: 'overtime_hours',
          label: `Overtime (${overtimeHours}h × ${scheme.overtimeMultiplier}x)`,
          amountCents: overtime,
        })
      }
      return { grossCents: regular + overtime, components }
    }

    case 'salary': {
      const periodGross = Math.round(scheme.annualCents / scheme.periodsPerYear)
      components.push({
        type: 'earning',
        code: 'salary',
        label: `Salary (${scheme.annualCents / 100} / ${scheme.periodsPerYear})`,
        amountCents: periodGross,
      })
      return { grossCents: periodGross, components }
    }

    case 'daily': {
      const days = input.daysWorked ?? 0
      const gross = Math.round(days * scheme.dailyRateCents)
      components.push({
        type: 'earning',
        code: 'daily',
        label: `Daily (${days}d × ${(scheme.dailyRateCents / 100).toFixed(2)})`,
        amountCents: gross,
      })
      return { grossCents: gross, components }
    }

    case 'commission': {
      const sales = input.salesAmountCents ?? 0
      let commissionCents: number

      if (scheme.tiers && scheme.tiers.length > 0) {
        // Comisión por tramos: aplica el rate de cada tramo a la porción
        // de ventas que cae en ese tramo (igual que income tax brackets).
        const sorted = [...scheme.tiers].sort((a, b) => a.thresholdCents - b.thresholdCents)
        let total = 0
        let prev = 0
        for (const tier of sorted) {
          const portion = Math.max(0, Math.min(sales, tier.thresholdCents) - prev)
          total += Math.round(portion * tier.rate)
          prev = tier.thresholdCents
        }
        // Porción sobre el último threshold usa el rate del último tramo.
        if (sales > prev) {
          total += Math.round((sales - prev) * sorted[sorted.length - 1].rate)
        }
        commissionCents = total
      } else {
        commissionCents = Math.round(sales * scheme.ratePct)
      }

      if (scheme.baseCents > 0) {
        components.push({
          type: 'earning',
          code: 'commission_base',
          label: 'Commission base',
          amountCents: scheme.baseCents,
        })
      }
      components.push({
        type: 'earning',
        code: 'commission_variable',
        label: `Commission (${(scheme.ratePct * 100).toFixed(2)}% × sales)`,
        amountCents: commissionCents,
      })
      return { grossCents: scheme.baseCents + commissionCents, components }
    }
  }
}

// -----------------------------------------------------------------------------
// 2) Cálculo completo (gross + taxes + net)
// -----------------------------------------------------------------------------

export function calculatePayroll(input: PayrollInput): PayrollCalculation {
  const { grossCents, components: earnings } = calcGross(input)

  // Impuestos del empleado (US, MVP)
  const federalTaxCents = calcUSFederalWithholding({
    grossCents,
    periodsPerYear: input.periodsPerYear,
    filingStatus: input.filingStatus,
    dependents: input.w4Dependents,
  })

  const socialSecurityCents = calcUSSocialSecurity(grossCents, input.ytdGrossCents ?? 0)
  const medicareCents = calcUSMedicare(grossCents, input.ytdGrossCents ?? 0)

  const stateTaxCents = 0  // stub — Phase 2 expand
  const otherDeductionsCents = 0

  // Costos del employer (no afectan el net del empleado)
  const employerSocialSecurityCents = socialSecurityCents  // employer paga igual al empleado
  const employerMedicareCents = Math.round(grossCents * 0.0145)  // sin additional 0.9%
  const employerFUTACents = calcUSEmployerFUTA(grossCents, input.ytdGrossCents ?? 0)

  const netCents =
    grossCents - federalTaxCents - socialSecurityCents - medicareCents - stateTaxCents - otherDeductionsCents

  const taxComponents: PayrollComponent[] = [
    {
      type: 'tax',
      code: 'federal_income',
      label: 'Federal income tax',
      amountCents: federalTaxCents,
    },
    {
      type: 'tax',
      code: 'social_security',
      label: 'Social Security (6.2%)',
      amountCents: socialSecurityCents,
    },
    {
      type: 'tax',
      code: 'medicare',
      label: 'Medicare (1.45%)',
      amountCents: medicareCents,
    },
  ]

  const employerTaxComponents: PayrollComponent[] = [
    {
      type: 'employer_tax',
      code: 'employer_social_security',
      label: 'Employer Social Security',
      amountCents: employerSocialSecurityCents,
    },
    {
      type: 'employer_tax',
      code: 'employer_medicare',
      label: 'Employer Medicare',
      amountCents: employerMedicareCents,
    },
    {
      type: 'employer_tax',
      code: 'employer_futa',
      label: 'Employer FUTA',
      amountCents: employerFUTACents,
    },
  ]

  return {
    grossCents,
    netCents,
    federalTaxCents,
    socialSecurityCents,
    medicareCents,
    stateTaxCents,
    otherDeductionsCents,
    employerSocialSecurityCents,
    employerMedicareCents,
    employerFUTACents,
    components: [...earnings, ...taxComponents, ...employerTaxComponents],
    breakdown: {
      input,
      gross: grossCents,
      taxes: { federalTaxCents, socialSecurityCents, medicareCents, stateTaxCents },
      net: netCents,
      employerTaxes: {
        employerSocialSecurityCents,
        employerMedicareCents,
        employerFUTACents,
      },
    },
  }
}
