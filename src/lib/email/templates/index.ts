/**
 * Plantillas de email transaccional (Resend).
 *
 * Cada template es una función que recibe un payload tipado y retorna
 * { subject, html, text } — todos los strings ya traducidos al locale dado.
 *
 * Los emails son HTML inline simple (sin React Email/MJML) para mantener
 * dependencias mínimas. Si crecen mucho, migrar a `@react-email/render`.
 */

import type { Locale } from '@/i18n/config'

export type EmailLocale = Locale

export type EmailContent = {
  subject: string
  html: string
  text: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://myjova.com'
const FROM_NAME = 'MyJova'

function wrap(title: string, body: string, cta?: { label: string; href: string }): string {
  const ctaHtml = cta
    ? `<div style="margin:32px 0;text-align:center"><a href="${cta.href}" style="background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${cta.label}</a></div>`
    : ''
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;padding:40px;max-width:100%">
        <tr><td>
          <div style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:8px">${FROM_NAME}</div>
          <h1 style="font-size:20px;color:#0f172a;margin:24px 0 16px">${title}</h1>
          <div style="font-size:15px;color:#334155;line-height:1.6">${body}</div>
          ${ctaHtml}
          <p style="font-size:12px;color:#94a3b8;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:24px">© 2026 MyJova · <a href="${APP_URL}" style="color:#64748b">${APP_URL.replace(/^https?:\/\//, '')}</a></p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}

// ---------- WELCOME ----------
export function welcomeEmail(
  locale: EmailLocale,
  payload: { firstName: string; orgName: string },
): EmailContent {
  const { firstName, orgName } = payload
  const dashboardUrl = `${APP_URL}/${locale}/dashboard`

  const dict = {
    en: {
      subject: `Welcome to MyJova, ${firstName} 👋`,
      title: `Welcome to MyJova, ${firstName}`,
      body: `<p>Your company <strong>${orgName}</strong> is ready. We've started your 30-day free trial of the Esencial plan.</p>
        <p>What to do next:</p>
        <ul><li>Add your first employees</li><li>Set up at least one worksite</li><li>Invite workers to clock in</li></ul>`,
      cta: 'Open dashboard',
    },
    es: {
      subject: `Bienvenido a MyJova, ${firstName} 👋`,
      title: `Bienvenido a MyJova, ${firstName}`,
      body: `<p>Tu empresa <strong>${orgName}</strong> está lista. Iniciamos tu prueba gratis de 30 días del plan Esencial.</p>
        <p>Qué hacer ahora:</p>
        <ul><li>Agrega tus primeros empleados</li><li>Configura al menos un sitio de trabajo</li><li>Invita a los trabajadores a registrar su asistencia</li></ul>`,
      cta: 'Abrir panel',
    },
    fr: {
      subject: `Bienvenue sur MyJova, ${firstName} 👋`,
      title: `Bienvenue sur MyJova, ${firstName}`,
      body: `<p>Votre entreprise <strong>${orgName}</strong> est prête. Nous avons activé votre essai gratuit de 30 jours du plan Esencial.</p>
        <p>Prochaines étapes :</p>
        <ul><li>Ajoutez vos premiers employés</li><li>Configurez au moins un chantier</li><li>Invitez les employés à pointer</li></ul>`,
      cta: 'Ouvrir le tableau de bord',
    },
    'fr-CA': {
      subject: `Bienvenue sur MyJova, ${firstName} 👋`,
      title: `Bienvenue sur MyJova, ${firstName}`,
      body: `<p>Votre entreprise <strong>${orgName}</strong> est prête. Nous avons activé votre essai gratuit de 30 jours du plan Esencial.</p>
        <p>Prochaines étapes :</p>
        <ul><li>Ajoutez vos premiers employés</li><li>Configurez au moins un chantier</li><li>Invitez les employés à poinçonner</li></ul>`,
      cta: 'Ouvrir le tableau de bord',
    },
  } as const

  const d = dict[locale] ?? dict.en
  return {
    subject: d.subject,
    html: wrap(d.title, d.body, { label: d.cta, href: dashboardUrl }),
    text: `${d.title}\n\n${d.body.replace(/<[^>]*>/g, '')}\n\n${d.cta}: ${dashboardUrl}`,
  }
}

// ---------- INVITE ----------
export function inviteEmail(
  locale: EmailLocale,
  payload: { orgName: string; inviterName: string; acceptUrl: string },
): EmailContent {
  const { orgName, inviterName, acceptUrl } = payload

  const dict = {
    en: {
      subject: `${inviterName} invited you to ${orgName} on MyJova`,
      title: `You've been invited to ${orgName}`,
      body: `<p><strong>${inviterName}</strong> invited you to clock in and view your pay stubs on MyJova.</p>
        <p>Click below to accept and set up your portal access.</p>`,
      cta: 'Accept invitation',
    },
    es: {
      subject: `${inviterName} te invitó a ${orgName} en MyJova`,
      title: `Has sido invitado a ${orgName}`,
      body: `<p><strong>${inviterName}</strong> te invitó a registrar tu asistencia y ver tus recibos de pago en MyJova.</p>
        <p>Haz clic abajo para aceptar y configurar tu acceso al portal.</p>`,
      cta: 'Aceptar invitación',
    },
    fr: {
      subject: `${inviterName} vous a invité à ${orgName} sur MyJova`,
      title: `Vous avez été invité à ${orgName}`,
      body: `<p><strong>${inviterName}</strong> vous a invité à pointer et consulter vos bulletins sur MyJova.</p>
        <p>Cliquez ci-dessous pour accepter et configurer votre accès au portail.</p>`,
      cta: "Accepter l'invitation",
    },
    'fr-CA': {
      subject: `${inviterName} vous a invité à ${orgName} sur MyJova`,
      title: `Vous avez été invité à ${orgName}`,
      body: `<p><strong>${inviterName}</strong> vous a invité à poinçonner et consulter vos bulletins de paie sur MyJova.</p>
        <p>Cliquez ci-dessous pour accepter et configurer votre accès au portail.</p>`,
      cta: "Accepter l'invitation",
    },
  } as const

  const d = dict[locale] ?? dict.en
  return {
    subject: d.subject,
    html: wrap(d.title, d.body, { label: d.cta, href: acceptUrl }),
    text: `${d.title}\n\n${d.body.replace(/<[^>]*>/g, '')}\n\n${d.cta}: ${acceptUrl}`,
  }
}

// ---------- PAYROLL READY ----------
export function payrollReadyEmail(
  locale: EmailLocale,
  payload: {
    orgName: string
    periodStart: string
    periodEnd: string
    runUrl: string
    totalAmount: string
    employeeCount: number
  },
): EmailContent {
  const { orgName, periodStart, periodEnd, runUrl, totalAmount, employeeCount } =
    payload

  const dict = {
    en: {
      subject: `Payroll ready for ${orgName} (${periodStart} – ${periodEnd})`,
      title: 'Your payroll run is ready to review',
      body: `<p>The payroll for <strong>${orgName}</strong> from ${periodStart} to ${periodEnd} has been calculated.</p>
        <ul><li><strong>${employeeCount}</strong> employees</li><li>Total: <strong>${totalAmount}</strong></li></ul>
        <p>Review and approve before the pay date.</p>`,
      cta: 'Review payroll',
    },
    es: {
      subject: `Nómina lista para ${orgName} (${periodStart} – ${periodEnd})`,
      title: 'Tu corrida de nómina está lista para revisar',
      body: `<p>La nómina de <strong>${orgName}</strong> del ${periodStart} al ${periodEnd} ya está calculada.</p>
        <ul><li><strong>${employeeCount}</strong> empleados</li><li>Total: <strong>${totalAmount}</strong></li></ul>
        <p>Revisa y aprueba antes de la fecha de pago.</p>`,
      cta: 'Revisar nómina',
    },
    fr: {
      subject: `Paie prête pour ${orgName} (${periodStart} – ${periodEnd})`,
      title: 'Votre paie est prête à être révisée',
      body: `<p>La paie de <strong>${orgName}</strong> du ${periodStart} au ${periodEnd} a été calculée.</p>
        <ul><li><strong>${employeeCount}</strong> employés</li><li>Total : <strong>${totalAmount}</strong></li></ul>
        <p>Révisez et approuvez avant la date de paie.</p>`,
      cta: 'Réviser la paie',
    },
    'fr-CA': {
      subject: `Paie prête pour ${orgName} (${periodStart} – ${periodEnd})`,
      title: 'Votre paie est prête à être révisée',
      body: `<p>La paie de <strong>${orgName}</strong> du ${periodStart} au ${periodEnd} a été calculée.</p>
        <ul><li><strong>${employeeCount}</strong> employés</li><li>Total : <strong>${totalAmount}</strong></li></ul>
        <p>Révisez et approuvez avant la date de paie.</p>`,
      cta: 'Réviser la paie',
    },
  } as const

  const d = dict[locale] ?? dict.en
  return {
    subject: d.subject,
    html: wrap(d.title, d.body, { label: d.cta, href: runUrl }),
    text: `${d.title}\n\n${d.body.replace(/<[^>]*>/g, '')}\n\n${d.cta}: ${runUrl}`,
  }
}

// ---------- BROADCAST ----------
export function broadcastEmail(
  locale: EmailLocale,
  payload: { title: string; body: string; cta?: { label: string; href: string } },
): EmailContent {
  // El title/body los provee el admin desde el composer (ya redactados)
  return {
    subject: payload.title,
    html: wrap(payload.title, `<p>${payload.body.replace(/\n/g, '</p><p>')}</p>`, payload.cta),
    text: `${payload.title}\n\n${payload.body}${payload.cta ? `\n\n${payload.cta.label}: ${payload.cta.href}` : ''}`,
  }
}

// ---------- SETTLEMENT READY (contratista: cheque autorizado) ----------
export function settlementReadyEmail(
  locale: EmailLocale,
  payload: {
    orgName: string
    periodStart: string
    periodEnd: string
    payDate: string
    checkTotal: string
    marginTotal: string
  },
): EmailContent {
  const { orgName, periodStart, periodEnd, payDate, checkTotal, marginTotal } = payload
  const url = `${APP_URL}/${locale}/my-settlements`

  const dict = {
    en: {
      subject: `Your settlement from ${orgName} is approved — ${checkTotal}`,
      title: 'Your settlement is approved',
      body: `<p><strong>${orgName}</strong> approved the payroll for <strong>${periodStart} → ${periodEnd}</strong>.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Check total (billed + HST) · your margin this period: <strong>${marginTotal}</strong> · pay date: ${payDate}.</p>
        <p>The full per-worker breakdown and the PDF for your books are in your portal.</p>`,
      cta: 'View my settlements',
    },
    es: {
      subject: `Tu liquidación de ${orgName} está aprobada — ${checkTotal}`,
      title: 'Tu liquidación está aprobada',
      body: `<p><strong>${orgName}</strong> aprobó la nómina del <strong>${periodStart} → ${periodEnd}</strong>.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Total del cheque (facturado + HST) · tu margen del período: <strong>${marginTotal}</strong> · fecha de pago: ${payDate}.</p>
        <p>El desglose por trabajador y el PDF para tu contabilidad están en tu portal.</p>`,
      cta: 'Ver mis liquidaciones',
    },
    fr: {
      subject: `Votre règlement de ${orgName} est approuvé — ${checkTotal}`,
      title: 'Votre règlement est approuvé',
      body: `<p><strong>${orgName}</strong> a approuvé la paie du <strong>${periodStart} → ${periodEnd}</strong>.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Total du chèque (facturé + HST) · votre marge de la période : <strong>${marginTotal}</strong> · date de paie : ${payDate}.</p>
        <p>Le détail par travailleur et le PDF pour votre comptabilité sont dans votre portail.</p>`,
      cta: 'Voir mes règlements',
    },
    'fr-CA': {
      subject: `Votre règlement de ${orgName} est approuvé — ${checkTotal}`,
      title: 'Votre règlement est approuvé',
      body: `<p><strong>${orgName}</strong> a approuvé la paie du <strong>${periodStart} → ${periodEnd}</strong>.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Total du chèque (facturé + HST) · votre marge de la période : <strong>${marginTotal}</strong> · date de paie : ${payDate}.</p>
        <p>Le détail par travailleur et le PDF pour votre comptabilité sont dans votre portail.</p>`,
      cta: 'Voir mes règlements',
    },
  } as const

  const d = dict[locale] ?? dict.en
  return {
    subject: d.subject,
    html: wrap(d.title, d.body, { label: d.cta, href: url }),
    text: `${d.title}\n\n${d.body.replace(/<[^>]*>/g, '')}\n\n${d.cta}: ${url}`,
  }
}

// ---------- SETTLEMENT PAID (contratista: cheque pagado) ----------
export function settlementPaidEmail(
  locale: EmailLocale,
  payload: { orgName: string; periodStart: string; periodEnd: string; checkTotal: string },
): EmailContent {
  const { orgName, periodStart, periodEnd, checkTotal } = payload
  const url = `${APP_URL}/${locale}/my-settlements`

  const dict = {
    en: {
      subject: `${orgName} marked your check as paid — ${checkTotal}`,
      title: 'Your check was paid',
      body: `<p><strong>${orgName}</strong> marked the payroll <strong>${periodStart} → ${periodEnd}</strong> as paid.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Remember to pay your crew and keep the settlement PDF for your records.</p>`,
      cta: 'View my settlements',
    },
    es: {
      subject: `${orgName} marcó tu cheque como pagado — ${checkTotal}`,
      title: 'Tu cheque fue pagado',
      body: `<p><strong>${orgName}</strong> marcó como pagada la nómina del <strong>${periodStart} → ${periodEnd}</strong>.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Recuerda pagar a tu equipo y guardar el PDF de la liquidación para tus registros.</p>`,
      cta: 'Ver mis liquidaciones',
    },
    fr: {
      subject: `${orgName} a marqué votre chèque comme payé — ${checkTotal}`,
      title: 'Votre chèque a été payé',
      body: `<p><strong>${orgName}</strong> a marqué la paie du <strong>${periodStart} → ${periodEnd}</strong> comme payée.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Pensez à payer votre équipe et à conserver le PDF du règlement pour vos dossiers.</p>`,
      cta: 'Voir mes règlements',
    },
    'fr-CA': {
      subject: `${orgName} a marqué votre chèque comme payé — ${checkTotal}`,
      title: 'Votre chèque a été payé',
      body: `<p><strong>${orgName}</strong> a marqué la paie du <strong>${periodStart} → ${periodEnd}</strong> comme payée.</p>
        <p style="font-size:22px;font-weight:700;margin:16px 0">${checkTotal}</p>
        <p>Pensez à payer votre équipe et à conserver le PDF du règlement pour vos dossiers.</p>`,
      cta: 'Voir mes règlements',
    },
  } as const

  const d = dict[locale] ?? dict.en
  return {
    subject: d.subject,
    html: wrap(d.title, d.body, { label: d.cta, href: url }),
    text: `${d.title}\n\n${d.body.replace(/<[^>]*>/g, '')}\n\n${d.cta}: ${url}`,
  }
}
