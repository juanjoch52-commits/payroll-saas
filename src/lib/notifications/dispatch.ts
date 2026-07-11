/**
 * Dispatcher central de notificaciones.
 *
 * Llamado desde Server Actions / Webhooks cuando ocurre un evento.
 * Consulta preferencias del usuario y fan-out a los canales habilitados.
 * Dedupe por dedupe_key (mismo evento no envía 2 emails).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { sendSms } from '@/lib/sms/send'
import { sendPushToUser } from '@/lib/push/send'
import {
  welcomeEmail,
  inviteEmail,
  payrollReadyEmail,
  broadcastEmail,
  type EmailLocale,
  type EmailContent,
} from '@/lib/email/templates'

export type NotifType =
  | 'welcome'
  | 'invite'
  | 'payroll_ready'
  | 'payroll_failed'
  | 'payroll_approved'
  | 'time_entry_pending'
  | 'time_entry_approved'
  | 'time_entry_rejected'
  | 'clock_anomaly'
  | 'tax_form_ready'
  | 'broadcast'
  | 'support_reply'
  | 'payment_failed'
  | 'plan_changed'
  | 'trial_ending'
  | 'schedule_published'
  | 'shift_swap'
  | 'time_off_request'
  | 'time_off_decision'
  | 'timesheet_submitted'
  | 'timesheet_decision'

export type Channel = 'inapp' | 'email' | 'sms' | 'push'

type DispatchInput = {
  userId: string
  organizationId?: string
  type: NotifType
  title: string
  body: string
  data?: Record<string, unknown>
  dedupeKey?: string
  cta?: { label: string; url: string }
  /** Optional override; otherwise reads notification_preferences */
  forceChannels?: Channel[]
  /** For email/sms — fallback if no template matches */
  emailContent?: Partial<EmailContent>
  /** Email template selector (when type has multiple variants) */
  emailTemplateData?: Record<string, unknown>
  /** User locale for email/sms */
  locale?: EmailLocale
}

const DEFAULT_PREFS: Record<NotifType, Record<Channel, boolean>> = {
  welcome: { inapp: true, email: true, sms: false, push: false },
  invite: { inapp: true, email: true, sms: false, push: true },
  payroll_ready: { inapp: true, email: true, sms: false, push: true },
  payroll_failed: { inapp: true, email: true, sms: true, push: true },
  payroll_approved: { inapp: true, email: false, sms: false, push: true },
  time_entry_pending: { inapp: true, email: false, sms: false, push: true },
  time_entry_approved: { inapp: true, email: false, sms: false, push: true },
  time_entry_rejected: { inapp: true, email: true, sms: false, push: true },
  clock_anomaly: { inapp: true, email: true, sms: false, push: true },
  tax_form_ready: { inapp: true, email: true, sms: false, push: false },
  broadcast: { inapp: true, email: true, sms: false, push: true },
  support_reply: { inapp: true, email: true, sms: false, push: true },
  payment_failed: { inapp: true, email: true, sms: true, push: true },
  plan_changed: { inapp: true, email: true, sms: false, push: false },
  trial_ending: { inapp: true, email: true, sms: false, push: true },
  schedule_published: { inapp: true, email: false, sms: false, push: true },
  shift_swap: { inapp: true, email: false, sms: false, push: true },
  time_off_request: { inapp: true, email: true, sms: false, push: true },
  time_off_decision: { inapp: true, email: true, sms: false, push: true },
  timesheet_submitted: { inapp: true, email: true, sms: false, push: true },
  timesheet_decision: { inapp: true, email: true, sms: false, push: true },
}

export type DispatchResult = {
  inappOk: boolean
  emailOk?: boolean
  smsOk?: boolean
  pushOk?: boolean
  skipped: Channel[]
}

export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const admin = createAdminClient()

  // 1) Resolve channels
  let channels: Channel[]
  if (input.forceChannels) {
    channels = input.forceChannels
  } else {
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('channel, enabled')
      .eq('user_id', input.userId)
      .eq('type', input.type)
    const map = new Map<Channel, boolean>()
    for (const p of prefs ?? []) map.set(p.channel as Channel, p.enabled)
    const defaults = DEFAULT_PREFS[input.type]
    channels = (['inapp', 'email', 'sms', 'push'] as Channel[]).filter(
      (c) => map.get(c) ?? defaults[c],
    )
  }

  const result: DispatchResult = { inappOk: false, skipped: [] }

  // 2) In-app first (always recorded if listed)
  if (channels.includes('inapp')) {
    const insert: Record<string, unknown> = {
      user_id: input.userId,
      organization_id: input.organizationId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      cta_label: input.cta?.label ?? null,
      cta_url: input.cta?.url ?? null,
      dedupe_key: input.dedupeKey ?? null,
    }
    const { error } = await admin
      .from('notifications')
      .upsert(insert, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    result.inappOk = !error
  }

  // Fetch user contact info for email/sms
  type UserMeta = { email?: string; phone?: string; locale?: EmailLocale }
  let userMeta: UserMeta = {}
  if (channels.includes('email') || channels.includes('sms')) {
    const { data: u } = await admin.auth.admin.getUserById(input.userId)
    userMeta = {
      email: u?.user?.email ?? undefined,
      phone: u?.user?.phone ?? undefined,
      locale: (u?.user?.user_metadata?.locale as EmailLocale) ?? input.locale ?? 'en',
    }
  }

  // 3) Email
  if (channels.includes('email')) {
    if (!userMeta.email) {
      result.skipped.push('email')
    } else {
      const content = renderEmail(input, userMeta.locale ?? 'en')
      const r = await sendEmail({
        to: userMeta.email,
        ...content,
      })
      result.emailOk = r.ok
      if (!r.ok && r.skipped) result.skipped.push('email')
    }
  }

  // 4) SMS
  if (channels.includes('sms')) {
    if (!userMeta.phone) {
      result.skipped.push('sms')
    } else {
      const text = `${input.title}\n\n${input.body}${input.cta?.url ? `\n${input.cta.url}` : ''}`
      const r = await sendSms(userMeta.phone, text)
      result.smsOk = r.ok
      if (!r.ok && r.skipped) result.skipped.push('sms')
    }
  }

  // 5) Push
  if (channels.includes('push')) {
    const r = await sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      url: input.cta?.url,
    })
    result.pushOk = r.delivered > 0
    if (r.skipped) result.skipped.push('push')
  }

  return result
}

function renderEmail(input: DispatchInput, locale: EmailLocale): EmailContent {
  // Use specific template when applicable
  if (input.type === 'welcome' && input.emailTemplateData) {
    return welcomeEmail(locale, input.emailTemplateData as { firstName: string; orgName: string })
  }
  if (input.type === 'invite' && input.emailTemplateData) {
    return inviteEmail(
      locale,
      input.emailTemplateData as { orgName: string; inviterName: string; acceptUrl: string },
    )
  }
  if (input.type === 'payroll_ready' && input.emailTemplateData) {
    return payrollReadyEmail(
      locale,
      input.emailTemplateData as {
        orgName: string
        periodStart: string
        periodEnd: string
        runUrl: string
        totalAmount: string
        employeeCount: number
      },
    )
  }
  if (input.type === 'broadcast') {
    return broadcastEmail(locale, {
      title: input.title,
      body: input.body,
      cta: input.cta ? { label: input.cta.label, href: input.cta.url } : undefined,
    })
  }
  // Fallback: generic
  return {
    subject: input.title,
    html: `<h1>${input.title}</h1><p>${input.body}</p>${
      input.cta ? `<p><a href="${input.cta.url}">${input.cta.label}</a></p>` : ''
    }`,
    text: `${input.title}\n\n${input.body}${input.cta ? `\n${input.cta.label}: ${input.cta.url}` : ''}`,
  }
}
