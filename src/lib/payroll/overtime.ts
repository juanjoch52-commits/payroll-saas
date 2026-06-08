// =============================================================================
// MyJova — Horas extra avanzadas (diaria, doble tiempo, 7º día, semanal).
// =============================================================================
// Puro y testeable. Reglas configurables por jurisdicción (ver overtime-presets).
// =============================================================================

export type OvertimeRules = {
  weeklyThreshold: number // p.ej. 40
  dailyOtThreshold?: number // CA: 8
  dailyDtThreshold?: number // CA: 12
  otMultiplier: number // 1.5
  dtMultiplier: number // 2
  seventhDayRule?: boolean // CA: 7º día consecutivo → OT primeras 8h, DT después
}

export type HoursSplit = { regular: number; overtime: number; doubletime: number }

const r2 = (n: number) => Math.round(n * 100) / 100

/** Divide las horas de UNA semana (array de 7 días) en regular/OT/DT. */
export function splitWeeklyHours(dailyHours: number[], rules: OvertimeRules): HoursSplit {
  const days = dailyHours.slice(0, 7)
  const allSeven = days.length >= 7 && days.slice(0, 7).every((h) => h > 0)
  let reg = 0
  let ot = 0
  let dt = 0

  days.forEach((h, i) => {
    if (h <= 0) return
    let dOt = 0
    let dDt = 0
    const seventh = rules.seventhDayRule && allSeven && i === 6
    if (seventh) {
      dOt = Math.min(h, 8)
      dDt = Math.max(0, h - 8)
    } else {
      if (rules.dailyDtThreshold != null) dDt = Math.max(0, h - rules.dailyDtThreshold)
      const cap = rules.dailyDtThreshold ?? Number.POSITIVE_INFINITY
      if (rules.dailyOtThreshold != null) {
        dOt = Math.max(0, Math.min(h, cap) - rules.dailyOtThreshold)
      }
    }
    reg += h - dOt - dDt
    ot += dOt
    dt += dDt
  })

  // OT semanal sobre las horas regulares que superen el umbral.
  const weeklyOt = Math.max(0, reg - rules.weeklyThreshold)
  reg -= weeklyOt
  ot += weeklyOt

  return { regular: r2(reg), overtime: r2(ot), doubletime: r2(dt) }
}

/** Agrupa entradas {date, hours} por semana (Lun-Dom) y suma los splits. */
export function splitByWeeks(
  entries: { date: string; hours: number }[],
  rules: OvertimeRules,
): HoursSplit {
  // week key = lunes de la semana (ISO-ish); dayIdx 0=Lun..6=Dom
  const byWeek = new Map<string, number[]>()
  for (const e of entries) {
    const d = new Date(e.date + 'T00:00:00')
    const day = d.getDay() // 0=Dom..6=Sab
    const dayIdx = day === 0 ? 6 : day - 1 // 0=Lun..6=Dom
    const monday = new Date(d)
    monday.setDate(d.getDate() - dayIdx)
    const key = monday.toISOString().slice(0, 10)
    const arr = byWeek.get(key) ?? [0, 0, 0, 0, 0, 0, 0]
    arr[dayIdx] += e.hours
    byWeek.set(key, arr)
  }
  const total: HoursSplit = { regular: 0, overtime: 0, doubletime: 0 }
  for (const arr of byWeek.values()) {
    const s = splitWeeklyHours(arr, rules)
    total.regular += s.regular
    total.overtime += s.overtime
    total.doubletime += s.doubletime
  }
  return { regular: r2(total.regular), overtime: r2(total.overtime), doubletime: r2(total.doubletime) }
}
