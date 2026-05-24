/**
 * Helper client-side para registrar service worker + suscripción push.
 * Se llama desde NotificationPreferences cuando el user habilita push.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64Safe)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

export async function subscribeToPush(): Promise<
  | { ok: true; subscription: PushSubscriptionJSON }
  | { ok: false; error: string }
> {
  if (!VAPID_PUBLIC) {
    return { ok: false, error: 'VAPID public key not configured' }
  }
  if (!('Notification' in window)) {
    return { ok: false, error: 'Notifications not supported' }
  }

  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission

  if (permission !== 'granted') {
    return { ok: false, error: `Permission ${permission}` }
  }

  const reg = await ensureServiceWorker()
  if (!reg) return { ok: false, error: 'Service worker registration failed' }

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast to BufferSource — TS lib gets confused about ArrayBufferLike vs ArrayBuffer
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
    })

    const json = sub.toJSON()
    // Send to our API to persist
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    })

    if (!res.ok) return { ok: false, error: 'Failed to persist subscription' }

    return { ok: true, subscription: json }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return true
  await sub.unsubscribe()
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
  return true
}
