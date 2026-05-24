import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlanCard } from '@/components/billing/PlanCard'

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
    .select('id, code, name, monthly_price_cents, max_employees, features')
    .order('sort_order')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, status, trial_ends_at, current_period_end')
    .eq('organization_id', session.organizationId)
    .single()

  const currentPlanCode = plans?.find((p) => p.id === subscription?.plan_id)?.code

  const daysLeft = subscription?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
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

      <div className="grid gap-6 md:grid-cols-3">
        {(plans ?? []).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.code === currentPlanCode}
            locale={locale as 'en' | 'es'}
          />
        ))}
      </div>
    </div>
  )
}
