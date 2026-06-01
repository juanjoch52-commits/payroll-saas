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
