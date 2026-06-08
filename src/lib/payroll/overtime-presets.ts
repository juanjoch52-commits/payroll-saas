import type { OvertimeRules } from './overtime'

// Reglas de horas extra por jurisdicción. Default = federal (semanal 40).
// California añade OT diaria (>8h), doble tiempo (>12h) y regla del 7º día.
export function getOvertimeRules(jurisdictionCode?: string): OvertimeRules {
  const code = (jurisdictionCode || '').toUpperCase()
  const isCA = code === 'CA' || code === 'US-CA' || code.endsWith('-CA')
  if (isCA) {
    return {
      weeklyThreshold: 40,
      dailyOtThreshold: 8,
      dailyDtThreshold: 12,
      otMultiplier: 1.5,
      dtMultiplier: 2,
      seventhDayRule: true,
    }
  }
  return { weeklyThreshold: 40, otMultiplier: 1.5, dtMultiplier: 2 }
}

/** Estados con prima por descanso/comida perdido (CA: 1h al rate si turno >5h sin descanso). */
export function hasMealBreakPremium(jurisdictionCode?: string): boolean {
  const code = (jurisdictionCode || '').toUpperCase()
  return code === 'CA' || code === 'US-CA' || code.endsWith('-CA')
}
