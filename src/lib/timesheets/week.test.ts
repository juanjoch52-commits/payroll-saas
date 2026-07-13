import { describe, it, expect } from 'vitest'
import {
  addDays,
  mondayOfKey,
  isMondayKey,
  weekDays,
  summarizeWeek,
  canSubmitWeek,
  formatMinutes,
  type WeekEntry,
} from './week'

function entry(partial: Partial<WeekEntry> & { clockInAt: string }): WeekEntry {
  return {
    id: partial.id ?? 'e1',
    clockInAt: partial.clockInAt,
    clockOutAt: partial.clockOutAt === undefined ? partial.clockInAt : partial.clockOutAt,
    billableMinutes: partial.billableMinutes ?? 0,
    status: partial.status ?? 'pending',
  }
}

describe('aritmética de day keys', () => {
  it('addDays cruza fin de mes y de año', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('mondayOfKey: miércoles y domingo caen al lunes de su semana; lunes queda igual', () => {
    // 2026-07-08 es miércoles; 2026-07-12 domingo; 2026-07-06 lunes
    expect(mondayOfKey('2026-07-08')).toBe('2026-07-06')
    expect(mondayOfKey('2026-07-12')).toBe('2026-07-06')
    expect(mondayOfKey('2026-07-06')).toBe('2026-07-06')
  })

  it('isMondayKey valida formato y día', () => {
    expect(isMondayKey('2026-07-06')).toBe(true)
    expect(isMondayKey('2026-07-07')).toBe(false)
    expect(isMondayKey('no-fecha')).toBe(false)
  })

  it('weekDays devuelve 7 días consecutivos desde el lunes', () => {
    const days = weekDays('2026-07-06')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-07-06')
    expect(days[6]).toBe('2026-07-12')
  })
})

describe('summarizeWeek', () => {
  const WEEK = '2026-07-06' // lunes
  const TZ = 'America/Toronto'

  it('domingo 23:30 local (lunes en UTC) cuenta dentro de la semana local', () => {
    // 2026-07-12T23:30 Toronto (EDT, UTC-4) = 2026-07-13T03:30Z
    const s = summarizeWeek(
      [entry({ clockInAt: '2026-07-13T03:30:00Z', billableMinutes: 60, status: 'pending' })],
      WEEK,
      TZ,
    )
    expect(s.totalMinutes).toBe(60)
    expect(s.days[6].minutes).toBe(60) // domingo local
  })

  it('una entry del lunes siguiente (local) queda fuera', () => {
    // 2026-07-13T08:00 Toronto = 12:00Z del lunes siguiente
    const s = summarizeWeek(
      [entry({ clockInAt: '2026-07-13T12:00:00Z', billableMinutes: 60 })],
      WEEK,
      TZ,
    )
    expect(s.totalMinutes).toBe(0)
    expect(s.entryCount).toBe(0)
  })

  it('separa aprobado / pendiente / rechazado; edited cuenta como pendiente', () => {
    const s = summarizeWeek(
      [
        entry({ id: 'a', clockInAt: '2026-07-06T12:00:00Z', billableMinutes: 480, status: 'approved' }),
        entry({ id: 'b', clockInAt: '2026-07-07T12:00:00Z', billableMinutes: 450, status: 'pending' }),
        entry({ id: 'c', clockInAt: '2026-07-08T12:00:00Z', billableMinutes: 30, status: 'edited' }),
        entry({ id: 'd', clockInAt: '2026-07-09T12:00:00Z', billableMinutes: 120, status: 'rejected' }),
      ],
      WEEK,
      TZ,
    )
    expect(s.approvedMinutes).toBe(480)
    expect(s.pendingMinutes).toBe(480)
    expect(s.rejectedMinutes).toBe(120)
    expect(s.totalMinutes).toBe(960)
    expect(s.entryCount).toBe(3)
    expect(s.weekEnd).toBe('2026-07-12')
  })

  it('un turno abierto marca hasOpenEntry y no suma minutos', () => {
    const s = summarizeWeek(
      [entry({ clockInAt: '2026-07-08T12:00:00Z', clockOutAt: null, billableMinutes: null, status: 'open' })],
      WEEK,
      TZ,
    )
    expect(s.hasOpenEntry).toBe(true)
    expect(s.totalMinutes).toBe(0)
  })
})

describe('canSubmitWeek', () => {
  const TZ = 'America/Toronto'
  const base = summarizeWeek(
    [entry({ clockInAt: '2026-07-06T12:00:00Z', billableMinutes: 480, status: 'pending' })],
    '2026-07-06',
    TZ,
  )

  it('semana en curso se puede cerrar; futura no', () => {
    expect(canSubmitWeek(base, null, '2026-07-08').ok).toBe(true)
    const future = summarizeWeek([], '2026-07-13', TZ)
    expect(canSubmitWeek(future, null, '2026-07-08')).toEqual({ ok: false, reason: 'future_week' })
  })

  it('bloquea con turno abierto', () => {
    const s = summarizeWeek(
      [
        entry({ id: 'a', clockInAt: '2026-07-06T12:00:00Z', billableMinutes: 480, status: 'pending' }),
        entry({ id: 'b', clockInAt: '2026-07-08T12:00:00Z', clockOutAt: null, status: 'open' }),
      ],
      '2026-07-06',
      TZ,
    )
    expect(canSubmitWeek(s, null, '2026-07-10')).toEqual({ ok: false, reason: 'open_entry' })
  })

  it('bloquea sin horas (solo rechazadas tampoco cuenta)', () => {
    const s = summarizeWeek(
      [entry({ clockInAt: '2026-07-06T12:00:00Z', billableMinutes: 300, status: 'rejected' })],
      '2026-07-06',
      TZ,
    )
    expect(canSubmitWeek(s, null, '2026-07-10')).toEqual({ ok: false, reason: 'no_hours' })
  })

  it('ya sometida o aprobada bloquea; devuelta permite re-someter', () => {
    expect(canSubmitWeek(base, 'submitted', '2026-07-10')).toEqual({ ok: false, reason: 'already_submitted' })
    expect(canSubmitWeek(base, 'approved', '2026-07-10')).toEqual({ ok: false, reason: 'already_approved' })
    expect(canSubmitWeek(base, 'rejected', '2026-07-10').ok).toBe(true)
  })
})

describe('formatMinutes', () => {
  it('formatea horas y minutos con cero a la izquierda', () => {
    expect(formatMinutes(2325)).toBe('38h 45m')
    expect(formatMinutes(60)).toBe('1h 00m')
    expect(formatMinutes(5)).toBe('0h 05m')
    expect(formatMinutes(-10)).toBe('0h 00m')
  })
})
