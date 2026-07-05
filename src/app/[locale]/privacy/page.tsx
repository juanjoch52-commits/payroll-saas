import Link from 'next/link'

export const dynamic = 'force-static'

// =============================================================================
// Privacy Policy — PLANTILLA. Revisar con un abogado antes de publicar cambios
// sustanciales. Se mantiene en inglés como idioma contractual (estándar SaaS).
// =============================================================================

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Who we are',
    body: [
      'MyJova ("we", "us") provides payroll, time-tracking and workforce management software for small businesses in the United States and Canada. This policy explains what personal information we collect, why, and how we handle it.',
    ],
  },
  {
    title: '2. Information we collect',
    body: [
      'Account data: name, email, company name, locale, and role within your organization.',
      'Employee records entered by your employer: contact details, hire date, compensation settings, tax withholding elections (e.g. W-4), and — where provided — government tax identifiers and bank account details for direct deposit.',
      'Time and location data: clock-in/out timestamps, and (if your employer enables it) GPS coordinates and photos captured at clock-in for verification.',
      'Billing data: subscription plan and payment status. Card details are processed by Stripe and never touch our servers.',
    ],
  },
  {
    title: '3. How we protect sensitive data',
    body: [
      'Government tax identifiers (SSN/SIN) and bank account numbers are encrypted at rest with AES-256-GCM. Only the last four digits are stored in plain form for display.',
      'All data is isolated per organization with database-level row security. Files (documents, photos, tax forms) live in private storage accessed only through short-lived signed URLs.',
    ],
  },
  {
    title: '4. How we use information',
    body: [
      'To operate the service: computing payroll, generating paystubs and tax forms, tracking time, and sending the notifications your organization configures (email, SMS, push).',
      'We do not sell personal information. We share it only with service providers needed to run MyJova (hosting, email/SMS delivery, payments) under their own data-protection obligations, or when the law requires it.',
    ],
  },
  {
    title: '5. Your rights',
    body: [
      'Organization owners can export all business data (JSON) from Settings → General at any time, and can request deletion of their organization.',
      'Employees: your employer is the data controller for records it enters about you. Direct access/correction/deletion requests to your employer; we assist them in fulfilling these requests (GDPR/CCPA/PIPEDA as applicable).',
    ],
  },
  {
    title: '6. Retention & contact',
    body: [
      'Payroll and tax records are retained as long as your organization keeps an account, and as required by tax law after termination.',
      'Questions or requests: hello@myjova.com.',
    ],
  },
]

export default function PrivacyPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← MyJova
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: June 2026</p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-12 border-t pt-6 text-xs text-muted-foreground">
        See also our <Link href={`/${locale}/terms`} className="underline underline-offset-4">Terms of Service</Link>.
      </p>
    </main>
  )
}
