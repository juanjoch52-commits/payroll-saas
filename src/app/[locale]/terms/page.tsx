import Link from 'next/link'

export const dynamic = 'force-static'

// =============================================================================
// Terms of Service — PLANTILLA. Revisar con un abogado antes de publicar
// cambios sustanciales. Inglés como idioma contractual (estándar SaaS).
// =============================================================================

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. The service',
    body: [
      'MyJova provides payroll calculation, time tracking, scheduling and related workforce tools ("the Service") on a subscription basis. By creating an organization you accept these terms on its behalf.',
    ],
  },
  {
    title: '2. Your responsibilities',
    body: [
      'You are the employer of record. You are responsible for the accuracy of the data you enter (hours, rates, tax elections), for reviewing every payroll run before approving it, and for filing and remitting taxes to the relevant authorities on time.',
      'MyJova computes withholding estimates from the information you provide and generates forms and files to help you file — it is software, not a tax adviser, payroll bureau, or money transmitter. Amounts must be validated with your accountant or tax authority.',
    ],
  },
  {
    title: '3. Payments & trial',
    body: [
      'New organizations start on a 14-day free trial. When it ends, core write actions pause until a plan is selected. Fees are billed via Stripe per the plan you choose and are non-refundable except where required by law.',
    ],
  },
  {
    title: '4. Data',
    body: [
      'Your organization owns its data. You can export it at any time (Settings → General). We process personal data as described in the Privacy Policy and act as processor for the employee records you enter.',
    ],
  },
  {
    title: '5. Acceptable use & availability',
    body: [
      'No unlawful use, no attempts to breach tenant isolation, no reselling without agreement. The Service is provided "as is"; we target high availability but do not guarantee uninterrupted operation.',
    ],
  },
  {
    title: '6. Liability & termination',
    body: [
      'To the maximum extent permitted by law, our aggregate liability is limited to the fees you paid in the twelve months before the claim. You may cancel at any time; we may suspend accounts that violate these terms. Payroll/tax records remain exportable for a reasonable wind-down period.',
      'Questions: hello@myjova.com.',
    ],
  },
]

export default function TermsPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← MyJova
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Terms of Service</h1>
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
        See also our <Link href={`/${locale}/privacy`} className="underline underline-offset-4">Privacy Policy</Link>.
      </p>
    </main>
  )
}
