/**
 * Resend wrapper. Devuelve éxito booleano sin lanzar para que dispatch()
 * pueda decidir qué hacer con fallos por canal.
 */
import { Resend } from 'resend'

const KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

let client: Resend | null = null
function getClient(): Resend | null {
  if (!KEY) return null
  if (!client) client = new Resend(KEY)
  return client
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean }

export async function sendEmail(args: {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}): Promise<SendEmailResult> {
  const c = getClient()
  if (!c) {
    // Dev fallback: log to console, skip actual send
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[email] (skipped, no RESEND_API_KEY) → ${args.to}: ${args.subject}`)
    }
    return { ok: false, error: 'RESEND_API_KEY not set', skipped: true }
  }

  try {
    const res = await c.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    })
    if (res.error) return { ok: false, error: res.error.message }
    return { ok: true, id: res.data?.id ?? '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
