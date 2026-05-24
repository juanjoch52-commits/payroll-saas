/**
 * Twilio SMS wrapper.
 *
 * Si no hay TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER configurados, hace fallback
 * a console.log (útil en dev / antes de pagar Twilio).
 *
 * Mensajes SMS son cortos (<160 chars idealmente para 1 segmento). Ver lib/notifications/dispatch
 * para el truncado automático.
 */
import twilio from 'twilio'

const SID = process.env.TWILIO_ACCOUNT_SID
const TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM = process.env.TWILIO_FROM_NUMBER

let client: ReturnType<typeof twilio> | null = null
function getClient() {
  if (!SID || !TOKEN || !FROM) return null
  if (!client) client = twilio(SID, TOKEN)
  return client
}

export type SendSmsResult =
  | { ok: true; sid: string }
  | { ok: false; error: string; skipped?: boolean }

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const c = getClient()
  if (!c) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[sms] (skipped, no Twilio creds) → ${to}: ${body.slice(0, 80)}…`)
    }
    return { ok: false, error: 'Twilio not configured', skipped: true }
  }

  try {
    const msg = await c.messages.create({
      to,
      from: FROM,
      body: body.length > 320 ? body.slice(0, 317) + '...' : body,
    })
    return { ok: true, sid: msg.sid }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
