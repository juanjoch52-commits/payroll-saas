import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { countActiveWorkers, syncStripeSeats } from '@/lib/billing/seats'
import { monthlyTotalCents } from '@/lib/pricing/plans'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlanCard } from '@/components/billing/PlanCard'

const fmt = (cents: number) => `$${(cents / 100).toFixed(0)}`

export default async function BillingPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: plans } = await supabase
    .from('plans')
    .select('id, code, name, base_price_cents, per_worker_price_cents, features')
    .order('sort_order')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, status, trial_ends_at, current_period_end, stripe_subscription_id')
    .eq('organization_id', session.organizationId)
    .single()

  const activeWorkers = await countActiveWorkers(supabase, session.organizationId)

  // Reconciliación perezosa: si algún sync post-alta/baja falló, abrir esta
  // página vuelve a alinear la cantidad de seats en Stripe. Best-effort.
  if (subscription?.stripe_subscription_id) {
    await syncStripeSeats(session.organizationId)
  }

  const currentPlan = plans?.find((p) => p.id === subscription?.plan_id)
  const currentPlanCode = currentPlan?.code

  const daysLeft = subscription?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null

  const estimatedCents = currentPlan
    ? monthlyTotalCents(
        currentPlan.base_price_cents ?? 0,
        currentPlan.per_worker_price_cents ?? 0,
        activeWorkers,
      )
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('billing.title')}</h1>
        {subscription?.status === 'trialing' && daysLeft !== null && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('billing.trialEndsIn', { days: daysLeft })}
          </p>
        )}
      </div>

      {currentPlan && estimatedCents !== null && (
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.usage.title')}</CardTitle>
            <CardDescription>{t('billing.usage.note')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('billing.currentPlan')}</p>
                <p className="text-2xl font-semibold">{currentPlan.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('billing.usage.activeWorkers')}
                </p>
                <p className="text-2xl font-semibold tabular-nums">{activeWorkers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('billing.usage.estimated')}</p>
                <p className="text-2xl font-semibold tabular-nums">{fmt(estimatedCents)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('billing.usage.formula', {
                    base: fmt(currentPlan.base_price_cents ?? 0),
                    workers: activeWorkers,
                    perWorker: fmt(currentPlan.per_worker_price_cents ?? 0),
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {(plans ?? []).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.code === currentPlanCode}
            activeWorkers={activeWorkers}
            locale={locale as 'en' | 'es' | 'fr' | 'fr-CA'}
          />
        ))}
      </div>
    </div>
  )
}
