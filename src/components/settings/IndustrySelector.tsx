'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  INDUSTRY_TYPES,
  getIndustryPreset,
  type IndustryType,
} from '@/lib/industry/presets'
import { setOrganizationIndustry } from '@/app/actions/organization'

/**
 * Selector de industria + nudges de preset.
 * El owner/admin elige la industria; debajo mostramos sugerencias de setup
 * (kiosko, worksites, geofence, propinas, producción) según el preset.
 */
export function IndustrySelector({
  locale,
  current,
}: {
  locale: string
  current: IndustryType
}) {
  const t = useTranslations()
  const [industry, setIndustry] = useState<IndustryType>(current)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preset = useMemo(() => getIndustryPreset(industry), [industry])

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await setOrganizationIndustry(industry)
      if (res.success) setSaved(true)
      else setError(res.error ?? 'Error')
    })
  }

  // Nudges: cada uno con su link de acción (algunos destinos se construyen
  // en fases posteriores pero existen al final del build).
  const nudges: { show: boolean; key: string; href?: string }[] = [
    { show: preset.suggestKiosk, key: 'kiosk', href: `/${locale}/settings/devices` },
    { show: preset.suggestWorksites, key: 'worksites', href: `/${locale}/worksites` },
    { show: preset.suggestGeofence, key: 'geofence', href: `/${locale}/worksites` },
    { show: preset.suggestProduction, key: 'production', href: `/${locale}/production` },
    { show: preset.suggestTips, key: 'tips' },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="industry">{t('settings.general.industry')}</Label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="industry"
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value as IndustryType)
              setSaved(false)
            }}
            className="flex h-10 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
          >
            {INDUSTRY_TYPES.map((it) => (
              <option key={it} value={it}>
                {t(`industry.types.${it}` as 'industry.types.general')}
              </option>
            ))}
          </select>
          <Button onClick={save} disabled={pending || industry === current}>
            {pending ? t('common.loading') : t('common.save')}
          </Button>
          {saved && <span className="text-sm text-success-foreground">{t('common.saved')}</span>}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Pago recomendado */}
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('settings.general.recommendedPay')}</p>
        <div className="flex flex-wrap gap-2">
          {preset.defaultPaySchemeTypes.map((s) => (
            <Badge key={s} variant="info">
              {t(`employees.schemes.${s}` as 'employees.schemes.hourly')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sugerencias de setup */}
      {nudges.some((n) => n.show) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('settings.general.suggestions')}</p>
          <ul className="space-y-2">
            {nudges
              .filter((n) => n.show)
              .map((n) => (
                <li
                  key={n.key}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span>{t(`settings.general.nudges.${n.key}` as 'settings.general.nudges.kiosk')}</span>
                  {n.href && (
                    <Link
                      href={n.href}
                      className="shrink-0 text-primary underline-offset-4 hover:underline"
                    >
                      {t('settings.general.setUp')}
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
