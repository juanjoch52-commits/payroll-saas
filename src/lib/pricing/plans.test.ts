import { describe, expect, it } from 'vitest'
import {
  PLAN_PRICING_USD,
  monthlyTotalCents,
  monthlyTotalUsd,
  typicalPlanForTeamSize,
} from './plans'

describe('plan pricing (base + per active worker)', () => {
  it('cobra solo la base con 0 trabajadores', () => {
    expect(monthlyTotalUsd('essential', 0)).toBe(PLAN_PRICING_USD.essential.base)
    expect(monthlyTotalCents(2900, 500, 0)).toBe(2900)
  })

  it('suma base + N × por-trabajador', () => {
    // essential $29 + 10 × $5 = $79
    expect(monthlyTotalUsd('essential', 10)).toBe(79)
    // advanced $59 + 25 × $7 = $234
    expect(monthlyTotalUsd('advanced', 25)).toBe(234)
    // premium $99 + 60 × $10 = $699
    expect(monthlyTotalUsd('premium', 60)).toBe(699)
  })

  it('nunca cobra seats negativos', () => {
    expect(monthlyTotalUsd('essential', -3)).toBe(PLAN_PRICING_USD.essential.base)
    expect(monthlyTotalCents(2900, 500, -1)).toBe(2900)
  })

  it('los tiers escalan: base y por-trabajador crecen con el plan', () => {
    const { essential, advanced, premium } = PLAN_PRICING_USD
    expect(advanced.base).toBeGreaterThan(essential.base)
    expect(premium.base).toBeGreaterThan(advanced.base)
    expect(advanced.perWorker).toBeGreaterThan(essential.perWorker)
    expect(premium.perWorker).toBeGreaterThan(advanced.perWorker)
  })

  it('el ROI elige tier típico por tamaño de equipo', () => {
    expect(typicalPlanForTeamSize(5)).toBe('essential')
    expect(typicalPlanForTeamSize(10)).toBe('essential')
    expect(typicalPlanForTeamSize(11)).toBe('advanced')
    expect(typicalPlanForTeamSize(50)).toBe('advanced')
    expect(typicalPlanForTeamSize(51)).toBe('premium')
  })
})
