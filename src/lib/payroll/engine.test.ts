import { describe, it, expect } from 'vitest'
import { calculatePayroll, type PayrollInput } from './engine'

// Base común: un empleado single, sin dependientes, bi-weekly, sin estado.
const base = {
  filingStatus: 'single' as const,
  w4Dependents: 0,
  periodsPerYear: 26,
  ytdGrossCents: 0,
}

function earning(out: ReturnType<typeof calculatePayroll>, code: string) {
  return out.components.find((c) => c.type === 'earning' && c.code === code)
}

describe('calcGross — piecerate', () => {
  it('paga rate × unidades (100 cajas × $0.50 = $50.00)', () => {
    const input: PayrollInput = {
      ...base,
      scheme: { type: 'piecerate', ratePerUnitCents: 50, unitLabel: 'box' },
      unitsProduced: 100,
    }
    const out = calculatePayroll(input)
    expect(out.grossCents).toBe(5000)
    expect(earning(out, 'piecerate')?.amountCents).toBe(5000)
    expect(earning(out, 'piecerate_makeup')).toBeUndefined()
  })

  it('aplica suelo FLSA cuando el destajo queda por debajo del mínimo', () => {
    // 100 cajas × $0.50 = $50.00; pero 80h × $7.25 = $580.00 → make-up $530.00
    const input: PayrollInput = {
      ...base,
      scheme: {
        type: 'piecerate',
        ratePerUnitCents: 50,
        unitLabel: 'box',
        minimumHourlyFloorCents: 725,
      },
      unitsProduced: 100,
      hoursForFloor: 80,
    }
    const out = calculatePayroll(input)
    expect(out.grossCents).toBe(58000)
    expect(earning(out, 'piecerate')?.amountCents).toBe(5000)
    expect(earning(out, 'piecerate_makeup')?.amountCents).toBe(53000)
  })

  it('NO aplica make-up cuando el destajo supera el suelo', () => {
    // 2000 unidades × $0.50 = $1000.00; 40h × $7.25 = $290.00 → sin make-up
    const input: PayrollInput = {
      ...base,
      scheme: {
        type: 'piecerate',
        ratePerUnitCents: 50,
        unitLabel: 'unit',
        minimumHourlyFloorCents: 725,
      },
      unitsProduced: 2000,
      hoursForFloor: 40,
    }
    const out = calculatePayroll(input)
    expect(out.grossCents).toBe(100000)
    expect(earning(out, 'piecerate_makeup')).toBeUndefined()
  })

  it('sin unidades produce gross 0', () => {
    const out = calculatePayroll({
      ...base,
      scheme: { type: 'piecerate', ratePerUnitCents: 50, unitLabel: 'unit' },
    })
    expect(out.grossCents).toBe(0)
  })
})

describe('calcGross — regresión de esquemas existentes', () => {
  it('hourly con horas extra (45h: 40 reg + 5 OT × 1.5)', () => {
    const out = calculatePayroll({
      ...base,
      scheme: { type: 'hourly', rateCents: 2500, overtimeMultiplier: 1.5, overtimeThresholdHours: 40 },
      hoursWorked: 45,
    })
    // 40×2500 = 100000 ; 5×2500×1.5 = 18750 ; total 118750
    expect(out.grossCents).toBe(118750)
    expect(earning(out, 'regular_hours')?.amountCents).toBe(100000)
    expect(earning(out, 'overtime_hours')?.amountCents).toBe(18750)
  })

  it('daily (5 días × $200)', () => {
    const out = calculatePayroll({
      ...base,
      scheme: { type: 'daily', dailyRateCents: 20000 },
      daysWorked: 5,
    })
    expect(out.grossCents).toBe(100000)
  })

  it('commission flat (10% de $10,000 + base $2,000)', () => {
    const out = calculatePayroll({
      ...base,
      scheme: { type: 'commission', baseCents: 200000, ratePct: 0.1 },
      salesAmountCents: 1000000,
    })
    // base 200000 + 10% de 1000000 = 100000 → 300000
    expect(out.grossCents).toBe(300000)
  })

  it('net = gross − impuestos del empleado', () => {
    const out = calculatePayroll({
      ...base,
      scheme: { type: 'piecerate', ratePerUnitCents: 100, unitLabel: 'unit' },
      unitsProduced: 1000,
    })
    expect(out.netCents).toBe(
      out.grossCents -
        out.federalTaxCents -
        out.socialSecurityCents -
        out.medicareCents -
        out.stateTaxCents -
        out.otherDeductionsCents,
    )
  })
})
