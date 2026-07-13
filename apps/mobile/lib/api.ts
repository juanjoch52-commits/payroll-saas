import { supabase } from './supabase'

const API = process.env.EXPO_PUBLIC_API_URL ?? ''

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function authedFetch(path: string, init?: RequestInit) {
  const token = await getToken()
  return fetch(`${API}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
}

export type ClockBody = {
  lat?: number
  lng?: number
  accuracy?: number
  worksiteId?: string
  photoBase64?: string
  /** Clock out: "no tomé mi almuerzo" — no se descuenta el break automático. */
  skipBreak?: boolean
}

export async function clockIn(body: ClockBody) {
  const res = await authedFetch('/time/clock-in', { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

export async function clockOut(body: ClockBody) {
  const res = await authedFetch('/time/clock-out', { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

export async function getEntries() {
  const res = await authedFetch('/time/entries')
  const json = await res.json().catch(() => ({}))
  return json.data ?? []
}

export async function getPaystubs() {
  const res = await authedFetch('/paystubs')
  const json = await res.json().catch(() => ({}))
  return json.data ?? []
}

export async function getPaystub(id: string) {
  const res = await authedFetch(`/paystubs/${id}`)
  const json = await res.json().catch(() => ({}))
  return json.data ?? null
}

export async function registerPushToken(expoToken: string, platform: string) {
  await authedFetch('/push/register', {
    method: 'POST',
    body: JSON.stringify({ expoToken, platform }),
  })
}

/** Devuelve la URL del PDF + el token, para descargar con FileSystem. */
export async function paystubPdfRequest(id: string, locale: string) {
  return {
    url: `${API}/api/v1/paystubs/${id}/pdf?locale=${locale}`,
    token: await getToken(),
  }
}

// -----------------------------------------------------------------------------
// Timesheets semanales (cerrar semana / pedir pago) + correcciones
// -----------------------------------------------------------------------------

export type WeekEntryApi = {
  id: string
  clock_in_at: string
  clock_out_at: string | null
  billable_minutes: number | null
  break_minutes: number | null
  break_waived: boolean
  manual_kind: 'full' | 'clock_out' | null
  status: 'open' | 'pending' | 'approved' | 'rejected' | 'edited'
  clock_in_outside_geofence: boolean
}

export type WeekView = {
  weekStart: string
  weekEnd: string
  timezone: string
  today: string
  prevWeek: string
  nextWeek: string | null
  totals: { total: number; approved: number; pending: number; rejected: number }
  hasOpenEntry: boolean
  days: { day: string; minutes: number; entries: WeekEntryApi[] }[]
  submission: {
    status: 'submitted' | 'approved' | 'rejected'
    submitted_at: string
    review_note: string | null
  } | null
  canSubmit: boolean
  blockReason: 'future_week' | 'open_entry' | 'no_hours' | 'already_submitted' | 'already_approved' | null
  breakPolicy: { autoDeductMinutes: number; thresholdMinutes: number } | null
  standardShiftMinutes: number
}

export async function getWeek(week?: string): Promise<WeekView | null> {
  const res = await authedFetch(`/time/week${week ? `?week=${week}` : ''}`)
  const json = await res.json().catch(() => ({}))
  return json.data ?? null
}

export async function submitWeek(body: { weekStart: string; note?: string }) {
  const res = await authedFetch('/time/submit-week', { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

export async function addManualEntry(body: {
  date: string
  timeIn: string
  timeOut: string
  noBreak?: boolean
  reason: string
}) {
  const res = await authedFetch('/time/manual-entry', { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

export async function fixClockOut(body: {
  entryId: string
  date: string
  time: string
  noBreak?: boolean
  reason: string
}) {
  const res = await authedFetch('/time/fix-clock-out', { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}
