import { describe, it, expect } from 'vitest'
import { splitWeeklyHours, splitByWeeks, type OvertimeRules } from './overtime'

const weekly: OvertimeRules = { weeklyThreshold: 40, otMultiplier: 1.5, dtMultiplier: 2 }
const ca: OvertimeRules = {
  weeklyThreshold: 40,
  dailyOtThreshold: 8,
  dailyDtThreshold: 12,
  otMultiplier: 1.5,
  dtMultiplier: 2,
  seventhDayRule: true,
}

describe('overtime split', () => {
  it('OT semanal sobre 40', () => {
    expect(splitWeeklyHours([8, 8, 8, 8, 10, 0, 0], weekly)).toEqual({
      regular: 40,
      overtime: 2,
      doubletime: 0,
    })
  })
  it('CA OT diaria > 8h', () => {
    expect(splitWeeklyHours([10, 0, 0, 0, 0, 0, 0], ca)).toEqual({
      regular: 8,
      overtime: 2,
      doubletime: 0,
    })
  })
  it('CA doble tiempo > 12h', () => {
    expect(splitWeeklyHours([13, 0, 0, 0, 0, 0, 0], ca)).toEqual({
      regular: 8,
      overtime: 4,
      doubletime: 1,
    })
  })
  it('CA 7º día consecutivo', () => {
    const s = splitWeeklyHours([8, 8, 8, 8, 8, 8, 8], ca)
    expect(s.regular + s.overtime + s.doubletime).toBe(56)
    expect(s.overtime).toBeGreaterThanOrEqual(8)
  })
  it('splitByWeeks agrupa por semana (2024-01-01 es lunes)', () => {
    const entries = [
      { date: '2024-01-01', hours: 8 },
      { date: '2024-01-02', hours: 8 },
      { date: '2024-01-03', hours: 8 },
      { date: '2024-01-04', hours: 8 },
      { date: '2024-01-05', hours: 10 },
      { date: '2024-01-08', hours: 8 },
      { date: '2024-01-09', hours: 8 },
      { date: '2024-01-10', hours: 8 },
      { date: '2024-01-11', hours: 8 },
      { date: '2024-01-12', hours: 10 },
    ]
    const s = splitByWeeks(entries, weekly)
    expect(s.regular).toBe(80)
    expect(s.overtime).toBe(4)
  })
})
