import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { AlertTriangle, Clock } from 'lucide-react'
import type { SubscriptionGate } from '@/lib/auth/subscription'

/**
 * Banner de estado de suscripción (server component, montado en AppShell).
 *  - Trial vencido / sub inactiva → banner bloqueante-informativo con CTA a Billing.
 *  - Trial activo con ≤7 días     → aviso suave con días restantes.
 * Las escrituras core se bloquean en las Server Actions (requireActiveSubscription);
 * este banner es la cara visible de ese estado.
 */
export async function SubscriptionBanner({
  gate,
  locale,
}: {
  gate: SubscriptionGate
  locale: string
}) {
  const t = await getTranslations()

  if (!gate.ok) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <span className="font-medium">
          {gate.reason === 'trial_expired'
            ? t('subscription.trialExpired')
            : t('subscription.inactive')}
        </span>
        <Link
          href={`/${locale}/billing`}
          className="rounded-md bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
        >
          {t('subscription.choosePlan')}
        </Link>
      </div>
    )
  }

  if (gate.status === 'trialing' && gate.trialDaysLeft !== null && gate.trialDaysLeft <= 7) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm">
        <Clock className="h-4 w-4 shrink-0 text-warning" />
        <span>{t('subscription.trialEndingSoon', { days: gate.trialDaysLeft })}</span>
        <Link
          href={`/${locale}/billing`}
          className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('subscription.choosePlan')}
        </Link>
      </div>
    )
  }

  return null
}
