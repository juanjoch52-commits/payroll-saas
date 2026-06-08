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
import { calcStateWithholding } from './us/states'
import type { OvertimeRules, HoursSplit } from './overtime'

// -----------------------------------------------------------------------------
// Tipos públicos
// -----------------------------------------------------------------------------

export type PayrollInput = {
  scheme: PaySchemeConfig
  hoursWorked?: number
  overtimeHours?: number
  daysWorked?: number
  salesAmountCents?: number
  /** Unidades producidas en el período (scheme 'piecerate'). */
  unitsProduced?: number
  /** Horas trabajadas, solo para el suelo de salario mínimo FLSA del scheme 'piecerate'. */
  hoursForFloor?: number
  /** Propinas del período (gravables, se suman al bruto). */
  tipsCents?: number
  /** Split de horas precomputado (regular/OT/DT) por jurisdicción — scheme 'hourly'. */
  hoursSplit?: HoursSplit
  /** Reglas de OT (para los multiplicadores). */
  overtimeRules?: OvertimeRules
  /** Ingresos extra gravables (p.ej. prima por descanso perdido). */
  extraEarnings?: { code: string; label: string; amountCents: number }[]
  // Datos del empleado necesarios para impuestos
  filingStatus: FilingStatus
  w4Dependents: number
  // Para FICA acumulado YTD (Medicare additional 0.9% sobre >$200k)
  ytdGrossCents?: number
  // Periodos por año del scheme — necesario para anualizar el gross y mirar brackets.
  periodsPerYear: number
  /** State jurisdiction code (e.g. 'CA', 'US-CA'). Empty → no state withholding. */
  stateCode?: string
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
      // Modo avanzado: split precomputado (OT diaria, doble tiempo, 7º día).
      if (input.hoursSplit && input.overtimeRules) {
        const sp = input.hoursSplit
        const rules = input.overtimeRules
        const reg = Math.round(sp.regular * scheme.rateCents)
        const otc = Math.round(sp.overtime * scheme.rateCents * rules.otMultiplier)
        const dtc = Math.round(sp.doubletime * scheme.rateCents * rules.dtMultiplier)
        if (reg > 0) {
          components.push({ type: 'earning', code: 'regular_hours', label: `Regular (${sp.regular}h)`, amountCents: reg })
        }
        if (otc > 0) {
          components.push({ type: 'earning', code: 'overtime_hours', label: `Overtime (${sp.overtime}h × ${rules.otMultiplier})`, amountCents: otc })
        }
        if (dtc > 0) {
          components.push({ type: 'earning', code: 'doubletime_hours', label: `Double time (${sp.doubletime}h × ${rules.dtMultiplier})`, amountCents: dtc })
        }
        return { grossCents: reg + otc + dtc, components }
      }

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

    case 'piecerate': {
      const units = input.unitsProduced ?? 0
      let gross = Math.round(units * scheme.ratePerUnitCents)
      components.push({
        type: 'earning',
        code: 'piecerate',
        label: `Piece rate (${units} ${scheme.unitLabel} × ${(scheme.ratePerUnitCents / 100).toFixed(2)})`,
        amountCents: gross,
      })

      // Suelo FLSA: un trabajador a destajo debe ganar al menos el salario
      // mínimo por las horas trabajadas. Si el destajo queda por debajo del
      // mínimo × horas, añadimos un "make-up" hasta el suelo.
      if (
        scheme.minimumHourlyFloorCents &&
        scheme.minimumHourlyFloorCents > 0 &&
        input.hoursForFloor &&
        input.hoursForFloor > 0
      ) {
        const floor = Math.round(input.hoursForFloor * scheme.minimumHourlyFloorCents)
        if (floor > gross) {
          components.push({
            type: 'earning',
            code: 'piecerate_makeup',
            label: 'Minimum wage make-up',
            amountCents: floor - gross,
          })
          gross = floor
        }
      }

      return { grossCents: gross, components }
    }
  }
}

// -----------------------------------------------------------------------------
// 2) Cálculo completo (gross + taxes + net)
// -----------------------------------------------------------------------------

export function calculatePayroll(input: PayrollInput): PayrollCalculation {
  const base = calcGross(input)
  const tipsCents = input.tipsCents ?? 0
  const earnings = [...base.components]
  if (tipsCents > 0) {
    earnings.push({ type: 'earning', code: 'tips', label: 'Tips', amountCents: tipsCents })
  }
  const extra = input.extraEarnings ?? []
  for (const x of extra) {
    earnings.push({ type: 'earning', code: x.code, label: x.label, amountCents: x.amountCents })
  }
  const extraTotal = extra.reduce((s, x) => s + x.amountCents, 0)
  const grossCents = base.grossCents + tipsCents + extraTotal

  // Impuestos del empleado (US, MVP)
  const federalTaxCents = calcUSFederalWithholding({
    grossCents,
    periodsPerYear: input.periodsPerYear,
    filingStatus: input.filingStatus,
    dependents: input.w4Dependents,
  })

  const socialSecurityCents = calcUSSocialSecurity(grossCents, input.ytdGrossCents ?? 0)
  const medicareCents = calcUSMedicare(grossCents, input.ytdGrossCents ?? 0)

  const stateTaxCents = input.stateCode
    ? calcStateWithholding({
        grossCents,
        periodsPerYear: input.periodsPerYear,
        filingStatus: input.filingStatus,
        dependents: input.w4Dependents,
        stateCode: input.stateCode,
      })
    : 0
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
