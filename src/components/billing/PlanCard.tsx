'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Plan = {
  id: string
  code: 'essential' | 'advanced' | 'premium' | string
  name: string
  base_price_cents: number
  per_worker_price_cents: number
  features: Record<string, unknown>
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(0)}`

export function PlanCard({
  plan,
  isCurrent,
  activeWorkers,
  locale,
}: {
  plan: Plan
  isCurrent: boolean
  /** Trabajadores activos de la org — para estimar el total mensual del plan. */
  activeWorkers: number
  locale: 'en' | 'es' | 'fr' | 'fr-CA'
}) {
  const t = useTranslations()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleUpgrade() {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planCode: plan.code, locale }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? 'Error')
    })
  }

  const planKey = plan.code as 'essential' | 'advanced' | 'premium'
  const featureKeys = t.raw(`billing.plans.${planKey}.features`) as string[]

  const estimatedCents =
    plan.base_price_cents + plan.per_worker_price_cents * Math.max(0, activeWorkers)

  return (
    <Card className={isCurrent ? 'border-primary ring-2 ring-primary/30' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{t(`billing.plans.${planKey}.name`)}</CardTitle>
            <CardDescription>{t(`billing.plans.${planKey}.tagline`)}</CardDescription>
          </div>
          {isCurrent && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {t('billing.currentBadge')}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold">{fmt(plan.base_price_cents)}</p>
          <p className="text-xs text-muted-foreground">
            {t('billing.perWorkerSuffix', { price: fmt(plan.per_worker_price_cents) })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('billing.estimatedFor', {
              total: fmt(estimatedCents),
              workers: activeWorkers,
            })}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="mb-6 space-y-2 text-sm">
          {featureKeys.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          variant={isCurrent ? 'outline' : 'default'}
          disabled={isCurrent || pending}
          onClick={handleUpgrade}
        >
          {pending ? t('common.loading') : isCurrent ? t('billing.currentBadge') : t('billing.upgrade')}
        </Button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
